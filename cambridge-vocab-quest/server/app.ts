import { randomBytes, randomUUID } from 'node:crypto'
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify'
import cookie from '@fastify/cookie'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import { z, type ZodType } from 'zod'
import {
  assignmentSchema,
  giftCatalogSchema,
  giftRequestSchema,
  learnerCreateSchema,
  learnerSelectSchema,
  learnerUpdateSchema,
  loginSchema,
  parentGateSchema,
  passwordResetConfirmSchema,
  passwordResetRequestSchema,
  questClaimSchema,
  quizAnswerSchema,
  quizCreateSchema,
  registerSchema,
  settingsSchema,
} from '../shared/schemas.js'
import type { CambridgeLevel, SafeLearner } from '../shared/types.js'
import { ACHIEVEMENTS, evaluateAchievements } from './achievements.js'
import { createSessionToken, digestToken, hashSecret, verifySecret } from './security.js'
import {
  defaultSettings,
  ensureDailyPractice,
  healthForAttempts,
  JsonStore,
  todayKey,
  type AttemptRecord,
  type DataStore,
  type LearnerRecord,
  type SessionRecord,
} from './store.js'
import { searchVocabulary, selectVocabulary, vocabulary } from './vocabulary.js'

const SESSION_COOKIE = 'cvq_session'
const SESSION_AGE_SECONDS = 60 * 60 * 24 * 14
const idParams = z.object({ id: z.string().uuid() })
const cambridgeLevels = ['Starters', 'Movers', 'Flyers', 'Preliminary'] as const
const vocabularySearchQuery = z.object({
  q: z.string().optional().default(''),
  level: z.enum(cambridgeLevels).optional(),
  limit: z.coerce.number().int().min(1).max(25).optional(),
})

const MAP_THRESHOLDS = {
  'nature-valley': 0,
  'space-station': 200,
  'crystal-caves': 350,
  'dragon-ridge': 550,
} as const

const MAP_LEVELS: Record<keyof typeof MAP_THRESHOLDS, CambridgeLevel> = {
  'space-station': 'Movers',
  'nature-valley': 'Starters',
  'crystal-caves': 'Flyers',
  'dragon-ridge': 'Preliminary',
}

class HttpError extends Error {
  constructor(readonly statusCode: number, message: string) {
    super(message)
  }
}

function parse<T>(schema: ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value)
  if (!result.success) throw new HttpError(400, result.error.issues[0]?.message ?? 'Invalid request')
  return result.data
}

function safeLearner(learner: LearnerRecord): SafeLearner {
  return {
    id: learner.id,
    name: learner.nickname,
    avatar: learner.avatar,
    level: learner.level,
    hasPin: Boolean(learner.pinHash),
    streak: learner.streak,
    gems: learner.gems,
  }
}

function csvCell(value: unknown): string {
  const text = String(value ?? '')
  return `"${text.replaceAll('"', '""')}"`
}

function attemptsForLearner(store: DataStore, learnerId: string): AttemptRecord[] {
  return store.read((database) => database.attempts.filter((item) => item.learnerId === learnerId))
}

function wordHealthSummaries(attempts: AttemptRecord[]) {
  const byWord = new Map<string, AttemptRecord[]>()
  for (const attempt of attempts) {
    const list = byWord.get(attempt.wordId) ?? []
    list.push(attempt)
    byWord.set(attempt.wordId, list)
  }
  return [...byWord.entries()].map(([wordId, wordAttempts]) => ({
    wordId,
    health: healthForAttempts(wordAttempts),
    accuracy: Math.round(100 * wordAttempts.filter((item) => item.correct).length / wordAttempts.length),
  }))
}

const MAP_STOP_UNLOCK_ORDER = ['dragon-ridge', 'crystal-caves', 'space-station', 'nature-valley'] as const

function levelRank(level: CambridgeLevel): number {
  return cambridgeLevels.indexOf(level)
}

function progressUnlockedLevel(correctCount: number): CambridgeLevel {
  for (const stop of MAP_STOP_UNLOCK_ORDER) {
    if (correctCount >= MAP_THRESHOLDS[stop]) return MAP_LEVELS[stop]
  }
  return 'Starters'
}

function mapUnlocks(correctCount: number, learnerLevel: CambridgeLevel) {
  const learnerIndex = levelRank(learnerLevel)
  return {
    'nature-valley':
      correctCount >= MAP_THRESHOLDS['nature-valley']
      || levelRank(MAP_LEVELS['nature-valley']) <= learnerIndex,
    'space-station':
      correctCount >= MAP_THRESHOLDS['space-station']
      || levelRank(MAP_LEVELS['space-station']) <= learnerIndex,
    'crystal-caves':
      correctCount >= MAP_THRESHOLDS['crystal-caves']
      || levelRank(MAP_LEVELS['crystal-caves']) <= learnerIndex,
    'dragon-ridge':
      correctCount >= MAP_THRESHOLDS['dragon-ridge']
      || levelRank(MAP_LEVELS['dragon-ridge']) <= learnerIndex,
  }
}

function highestUnlockedLevel(correctCount: number, learnerLevel: CambridgeLevel): CambridgeLevel {
  const fromProgress = progressUnlockedLevel(correctCount)
  return levelRank(fromProgress) >= levelRank(learnerLevel) ? fromProgress : learnerLevel
}

function promoteLearnerLevel(learner: LearnerRecord, correctCount: number): boolean {
  const progressLevel = progressUnlockedLevel(correctCount)
  if (levelRank(progressLevel) <= levelRank(learner.level)) return false
  learner.level = progressLevel
  return true
}

function buildDailyQuestProgress(
  todayAttempts: AttemptRecord[],
  words: typeof vocabulary,
  correctCount: number,
  claimedQuestIds: string[],
  learnerLevel: CambridgeLevel,
) {
  const questLevel = highestUnlockedLevel(correctCount, learnerLevel)
  const levelOf = (wordId: string) => words.find((word) => word.id === wordId)?.level

  let answerStreak = 0
  for (const attempt of [...todayAttempts].reverse()) {
    if (!attempt.correct || levelOf(attempt.wordId) !== questLevel) break
    answerStreak += 1
  }

  const focusCorrect = todayAttempts.filter(
    (attempt) => attempt.correct && levelOf(attempt.wordId) === questLevel,
  ).length
  const reviewCount = todayAttempts.filter((attempt) => levelOf(attempt.wordId) === questLevel).length

  const focusProgress = Math.min(focusCorrect, 1)
  const reviewProgress = Math.min(reviewCount, 5)
  const streakProgress = Math.min(answerStreak, 5)

  const quests = [
    {
      id: 'focus',
      label: `Complete 1 ${questLevel} word`,
      progress: focusProgress,
      target: 1,
      reward: 30,
      claimed: claimedQuestIds.includes('focus'),
    },
    {
      id: 'review',
      label: `Practice 5 ${questLevel} words`,
      progress: reviewProgress,
      target: 5,
      reward: 50,
      claimed: claimedQuestIds.includes('review'),
    },
    {
      id: 'streak',
      label: `Maintain a 5-answer ${questLevel} streak`,
      progress: streakProgress,
      target: 5,
      reward: 70,
      claimed: claimedQuestIds.includes('streak'),
    },
  ]

  const progress = {
    focus: focusProgress,
    review: reviewProgress,
    streak: streakProgress,
    bonus: [focusProgress >= 1, reviewProgress >= 5, streakProgress >= 5].filter(Boolean).length,
  }

  return { quests, progress }
}

function relativeTime(iso: string | null): string {
  if (!iso) return '—'
  const minutes = Math.max(1, Math.round((Date.now() - Date.parse(iso)) / 60_000))
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 48) return `${hours} hours ago`
  return `${Math.round(hours / 24)} days ago`
}

function syncAchievements(store: DataStore, learnerId: string): string[] {
  return store.read((database) => {
    const learner = database.learners.find((item) => item.id === learnerId)
    if (!learner) return []
    const attempts = database.attempts.filter((item) => item.learnerId === learnerId)
    const quizzes = database.quizzes.filter((item) => item.learnerId === learnerId)
    const redemptions = database.redemptions.filter((item) => item.learnerId === learnerId)
    return evaluateAchievements(learner, attempts, { quizzes, redemptions })
  })
}

export interface BuildAppOptions {
  store?: DataStore
  logger?: boolean
}

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({ logger: options.logger ?? false, trustProxy: true })
  const store = options.store ?? new JsonStore()
  await store.init()

  const configuredOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)

  await app.register(cookie)
  await app.register(cors, {
    credentials: true,
    origin: (origin, callback) => {
      if (!origin || configuredOrigins.includes(origin)) callback(null, true)
      else callback(new Error('Origin is not allowed'), false)
    },
  })
  await app.register(rateLimit, {
    max: Number(process.env.RATE_LIMIT_MAX ?? 120),
    timeWindow: '1 minute',
  })

  app.setErrorHandler((error, _request, reply) => {
    const details = error instanceof Error ? error : new Error('Unknown error')
    const reportedStatus = typeof error === 'object' && error && 'statusCode' in error
      ? Number(error.statusCode)
      : 500
    const statusCode = error instanceof HttpError
      ? error.statusCode
      : Number.isInteger(reportedStatus) && reportedStatus >= 400 && reportedStatus <= 599
        ? reportedStatus
        : 500
    if (statusCode >= 500) app.log.error(error)
    reply.code(statusCode).send({ error: statusCode >= 500 ? 'Internal server error' : details.message })
  })

  function sessionFor(request: FastifyRequest): SessionRecord | undefined {
    const token = request.cookies[SESSION_COOKIE]
    if (!token) return undefined
    const now = Date.now()
    return store.read((database) =>
      database.sessions.find((session) =>
        session.tokenHash === digestToken(token) && Date.parse(session.expiresAt) > now,
      ),
    )
  }

  function requireSession(request: FastifyRequest): SessionRecord {
    const session = sessionFor(request)
    if (!session) throw new HttpError(401, 'Authentication required')
    return session
  }

  function requireParent(request: FastifyRequest): SessionRecord {
    const session = requireSession(request)
    if (!session.parentVerifiedUntil || Date.parse(session.parentVerifiedUntil) <= Date.now()) {
      throw new HttpError(403, 'Parent verification required')
    }
    return session
  }

  function requireLearner(request: FastifyRequest): { session: SessionRecord; learner: LearnerRecord } {
    const session = requireSession(request)
    if (!session.selectedLearnerId) throw new HttpError(409, 'Select a learner first')
    const learner = store.read((database) =>
      database.learners.find((item) => item.id === session.selectedLearnerId && item.userId === session.userId),
    )
    if (!learner) throw new HttpError(404, 'Learner not found')
    return { session, learner }
  }

  async function issueSession(userId: string, reply: FastifyReply): Promise<void> {
    const token = createSessionToken()
    const expiresAt = new Date(Date.now() + SESSION_AGE_SECONDS * 1000).toISOString()
    await store.update((database) => {
      database.sessions = database.sessions.filter((session) =>
        session.userId !== userId && Date.parse(session.expiresAt) > Date.now(),
      )
      database.sessions.push({
        tokenHash: digestToken(token),
        userId,
        parentVerifiedUntil: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        expiresAt,
      })
    })
    reply.setCookie(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' || process.env.COOKIE_SECURE === 'true',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_AGE_SECONDS,
    })
  }

  app.get('/api/health', async () => ({ ok: true }))

  app.post('/api/auth/register', {
    config: { rateLimit: { max: 8, timeWindow: '15 minutes' } },
  }, async (request, reply) => {
    const body = parse(registerSchema, request.body)
    const duplicate = store.read((database) => database.users.some((user) => user.email === body.email))
    if (duplicate) throw new HttpError(409, 'An account with that email already exists')
    const user = {
      id: randomUUID(),
      name: body.name,
      email: body.email,
      passwordHash: await hashSecret(body.password),
      createdAt: new Date().toISOString(),
      giftCatalog: [],
    }
    await store.update((database) => database.users.push(user))
    await issueSession(user.id, reply)
    return reply.code(201).send({ user: { id: user.id, name: user.name, email: user.email } })
  })

  app.post('/api/auth/login', {
    config: { rateLimit: { max: 10, timeWindow: '15 minutes' } },
  }, async (request, reply) => {
    const body = parse(loginSchema, request.body)
    const user = store.read((database) => database.users.find((item) => item.email === body.email))
    if (!user || !(await verifySecret(body.password, user.passwordHash))) {
      throw new HttpError(401, 'Invalid email or password')
    }
    await issueSession(user.id, reply)
    return { user: { id: user.id, name: user.name, email: user.email } }
  })

  app.post('/api/auth/password-reset/request', {
    config: { rateLimit: { max: 5, timeWindow: '15 minutes' } },
  }, async (request) => {
    const body = parse(passwordResetRequestSchema, request.body)
    const user = store.read((database) => database.users.find((item) => item.email === body.email))
    const token = randomBytes(32).toString('base64url')
    if (user) {
      await store.update((database) => {
        database.passwordResets = database.passwordResets.filter((item) => item.email !== body.email)
        database.passwordResets.push({
          email: body.email,
          tokenHash: digestToken(token),
          expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        })
      })
    }
    const payload: { ok: true; resetToken?: string } = { ok: true }
    if (process.env.NODE_ENV !== 'production' && user) payload.resetToken = token
    return payload
  })

  app.post('/api/auth/password-reset/confirm', {
    config: { rateLimit: { max: 5, timeWindow: '15 minutes' } },
  }, async (request) => {
    const body = parse(passwordResetConfirmSchema, request.body)
    const tokenHash = digestToken(body.token)
    const reset = store.read((database) =>
      database.passwordResets.find((item) => item.tokenHash === tokenHash && Date.parse(item.expiresAt) > Date.now()),
    )
    if (!reset) throw new HttpError(400, 'Reset link is invalid or expired')
    const passwordHash = await hashSecret(body.password)
    await store.update((database) => {
      const user = database.users.find((item) => item.email === reset.email)
      if (!user) throw new HttpError(404, 'Account not found')
      user.passwordHash = passwordHash
      database.passwordResets = database.passwordResets.filter((item) => item.email !== reset.email)
      database.sessions = database.sessions.filter((session) => session.userId !== user.id)
    })
    return { ok: true }
  })

  app.post('/api/auth/logout', async (request, reply) => {
    const token = request.cookies[SESSION_COOKIE]
    if (token) {
      await store.update((database) => {
        database.sessions = database.sessions.filter((session) => session.tokenHash !== digestToken(token))
      })
    }
    reply.clearCookie(SESSION_COOKIE, { path: '/' })
    return reply.code(204).send()
  })

  app.get('/api/auth/session', async (request) => {
    const session = sessionFor(request)
    if (!session) return { authenticated: false }
    const user = store.read((database) => database.users.find((item) => item.id === session.userId))
    if (!user) return { authenticated: false }
    return {
      authenticated: true,
      user: { id: user.id, name: user.name, email: user.email },
      selectedLearnerId: session.selectedLearnerId ?? null,
      parentVerified: Boolean(session.parentVerifiedUntil && Date.parse(session.parentVerifiedUntil) > Date.now()),
    }
  })

  app.post('/api/auth/parent-gate', {
    config: { rateLimit: { max: 8, timeWindow: '15 minutes' } },
  }, async (request) => {
    const session = requireSession(request)
    const body = parse(parentGateSchema, request.body)
    const user = store.read((database) => database.users.find((item) => item.id === session.userId))
    if (!user || !(await verifySecret(body.password, user.passwordHash))) {
      throw new HttpError(401, 'Invalid parent password')
    }
    const parentVerifiedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString()
    await store.update((database) => {
      const current = database.sessions.find((item) => item.tokenHash === session.tokenHash)
      if (current) current.parentVerifiedUntil = parentVerifiedUntil
    })
    return { verified: true, expiresAt: parentVerifiedUntil }
  })

  app.get('/api/learners', async (request) => {
    const session = requireSession(request)
    return {
      learners: store.read((database) =>
        database.learners.filter((learner) => learner.userId === session.userId).map(safeLearner),
      ),
      selectedLearnerId: session.selectedLearnerId ?? null,
    }
  })

  app.post('/api/learners', async (request, reply) => {
    const session = requireSession(request)
    const body = parse(learnerCreateSchema, request.body)
    const learner: LearnerRecord = {
      id: randomUUID(),
      userId: session.userId,
      nickname: body.name,
      avatar: body.avatar,
      level: body.level,
      pinHash: body.pin ? await hashSecret(body.pin) : undefined,
      streak: 0,
      gems: 0,
      claimedQuestIds: [],
      achievementIds: [],
      perfectQuizCount: 0,
      minutesPractisedToday: 0,
      completedQuizToday: false,
      settings: defaultSettings(),
      createdAt: new Date().toISOString(),
    }
    await store.update((database) => database.learners.push(learner))
    return reply.code(201).send({ learner: safeLearner(learner) })
  })

  app.post('/api/learners/select', {
    config: { rateLimit: { max: 12, timeWindow: '15 minutes' } },
  }, async (request) => {
    const session = requireSession(request)
    const body = parse(learnerSelectSchema, request.body)
    const learner = store.read((database) =>
      database.learners.find((item) => item.id === body.learnerId && item.userId === session.userId),
    )
    if (!learner) throw new HttpError(404, 'Learner not found')
    if (learner.pinHash && (!body.pin || !(await verifySecret(body.pin, learner.pinHash)))) {
      throw new HttpError(401, 'Invalid learner PIN')
    }
    await store.update((database) => {
      const current = database.sessions.find((item) => item.tokenHash === session.tokenHash)
      if (current) {
        current.selectedLearnerId = learner.id
        current.parentVerifiedUntil = undefined
      }
    })
    return { learner: safeLearner(learner) }
  })

  app.delete('/api/learners/:id', async (request, reply) => {
    const session = requireParent(request)
    const { id } = parse(idParams, request.params)
    const learner = store.read((database) =>
      database.learners.find((item) => item.id === id && item.userId === session.userId),
    )
    if (!learner) throw new HttpError(404, 'Learner not found')
    await store.update((database) => {
      database.learners = database.learners.filter((item) => item.id !== id)
      database.quizzes = database.quizzes.filter((item) => item.learnerId !== id)
      database.attempts = database.attempts.filter((item) => item.learnerId !== id)
      database.assignments = database.assignments.filter((item) => item.learnerId !== id)
      database.redemptions = database.redemptions.filter((item) => item.learnerId !== id)
      for (const current of database.sessions) {
        if (current.selectedLearnerId === id) current.selectedLearnerId = undefined
      }
    })
    return reply.code(204).send()
  })

  app.patch('/api/learners/:id', async (request) => {
    const session = requireParent(request)
    const { id } = parse(idParams, request.params)
    const body = parse(learnerUpdateSchema, request.body ?? {})
    const exists = store.read((database) =>
      database.learners.find((item) => item.id === id && item.userId === session.userId),
    )
    if (!exists) throw new HttpError(404, 'Learner not found')

    const pinHash = body.pin ? await hashSecret(body.pin) : undefined
    const updated = await store.update((database) => {
      const current = database.learners.find((item) => item.id === id && item.userId === session.userId)
      if (!current) throw new HttpError(404, 'Learner not found')
      if (body.name !== undefined) current.nickname = body.name
      if (body.avatar !== undefined) current.avatar = body.avatar
      if (body.level !== undefined) current.level = body.level
      if (body.clearPin) delete current.pinHash
      else if (pinHash) current.pinHash = pinHash
      return safeLearner(current)
    })
    return { learner: updated }
  })

  app.get('/api/vocabulary/search', async (request) => {
    requireLearner(request)
    const query = parse(vocabularySearchQuery, request.query ?? {})
    return { results: searchVocabulary(query.q, { level: query.level, limit: query.limit }) }
  })

  app.get('/api/learner/hub', async (request) => {
    const { learner } = requireLearner(request)
    const attempts = attemptsForLearner(store, learner.id)
    const correctCount = attempts.filter((attempt) => attempt.correct).length
    await store.update((database) => {
      const current = database.learners.find((item) => item.id === learner.id)
      if (!current) return
      ensureDailyPractice(current)
      promoteLearnerLevel(current, correctCount)
    })
    const fresh = store.read((database) => database.learners.find((item) => item.id === learner.id)) ?? learner
    const today = todayKey()
    const todayAttempts = attempts.filter((attempt) => attempt.answeredAt.slice(0, 10) === today)
    const { quests } = buildDailyQuestProgress(
      todayAttempts,
      vocabulary,
      correctCount,
      fresh.claimedQuestIds,
      fresh.level,
    )
    const unlocked = mapUnlocks(correctCount, fresh.level)
    const achievementIds = syncAchievements(store, fresh.id)
    await store.update((database) => {
      const current = database.learners.find((item) => item.id === fresh.id)
      if (current) current.achievementIds = achievementIds
    })
    const health = wordHealthSummaries(attempts)
    const healthRank: Record<string, number> = {
      'At risk': 0,
      Warming: 1,
      New: 2,
      Healthy: 3,
    }
    const journey = health
      .map((item) => {
        const word = vocabulary.find((entry) => entry.id === item.wordId)
        if (!word) return null
        return {
          wordId: word.id,
          word: word.word,
          category: word.category,
          definition: word.definition,
          mastery: item.accuracy,
          health: item.health,
        }
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .sort((a, b) => {
        const healthDiff = (healthRank[a.health] ?? 99) - (healthRank[b.health] ?? 99)
        if (healthDiff !== 0) return healthDiff
        if (a.mastery !== b.mastery) return a.mastery - b.mastery
        return a.word.localeCompare(b.word)
      })
      .slice(0, 8)

    const assignment = store.read((database) =>
      database.assignments
        .filter((item) => item.learnerId === fresh.id)
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0],
    )

    const minutesRemaining = Math.max(0, fresh.settings.dailyLimitMinutes - fresh.minutesPractisedToday)

    return {
      learner: safeLearner(fresh),
      dailyGoal: fresh.settings.dailyGoal,
      completedToday: todayAttempts.length,
      recentAccuracy: attempts.length
        ? Math.round(100 * attempts.filter((attempt) => attempt.correct).length / attempts.length)
        : 0,
      settings: fresh.settings,
      minutesRemaining,
      completedQuizToday: fresh.completedQuizToday,
      quests,
      map: {
        unlocks: unlocked,
        correctCount,
        thresholds: MAP_THRESHOLDS,
      },
      achievements: ACHIEVEMENTS.map((item) => ({
        ...item,
        unlocked: achievementIds.includes(item.id),
      })),
      journey,
      assignment: assignment
        ? { id: assignment.id, level: assignment.level, categories: assignment.categories }
        : null,
      bonusReady: quests.every((quest) => quest.progress >= quest.target) && !fresh.claimedQuestIds.includes('bonus'),
    }
  })

  app.post('/api/learner/quests/claim', async (request) => {
    const { learner } = requireLearner(request)
    const body = parse(questClaimSchema, request.body)
    const hubQuests = [
      { id: 'focus', target: 1, reward: 30 },
      { id: 'review', target: 5, reward: 50 },
      { id: 'streak', target: 5, reward: 70 },
      { id: 'bonus', target: 3, reward: 100 },
    ]
    const quest = hubQuests.find((item) => item.id === body.questId)
    if (!quest) throw new HttpError(404, 'Quest not found')
    if (learner.claimedQuestIds.includes(quest.id)) throw new HttpError(409, 'Reward already claimed')

    const attempts = attemptsForLearner(store, learner.id)
    const correctCount = attempts.filter((attempt) => attempt.correct).length
    await store.update((database) => {
      const current = database.learners.find((item) => item.id === learner.id)
      if (!current) return
      promoteLearnerLevel(current, correctCount)
    })
    const freshLearner = store.read((database) => database.learners.find((item) => item.id === learner.id))
    if (!freshLearner) throw new HttpError(404, 'Learner not found')
    const today = todayKey()
    const todayAttempts = attempts.filter((attempt) => attempt.answeredAt.slice(0, 10) === today)
    const { progress: questProgress } = buildDailyQuestProgress(
      todayAttempts,
      vocabulary,
      correctCount,
      freshLearner.claimedQuestIds,
      freshLearner.level,
    )
    const progress = questProgress[quest.id as keyof typeof questProgress] ?? 0
    if (progress < quest.target) throw new HttpError(400, 'Quest is not complete yet')

    const updated = await store.update((database) => {
      const current = database.learners.find((item) => item.id === learner.id)
      if (!current) throw new HttpError(404, 'Learner not found')
      if (current.claimedQuestIds.includes(quest.id)) throw new HttpError(409, 'Reward already claimed')
      current.claimedQuestIds.push(quest.id)
      current.gems += quest.reward
      if (!current.achievementIds.includes('quest_first')) {
        current.achievementIds.push('quest_first')
      }
      if (quest.id === 'bonus' && !current.achievementIds.includes('quest_bonus')) {
        current.achievementIds.push('quest_bonus')
      }
      const attempts = database.attempts.filter((item) => item.learnerId === learner.id)
      const quizzes = database.quizzes.filter((item) => item.learnerId === learner.id)
      const redemptions = database.redemptions.filter((item) => item.learnerId === learner.id)
      current.achievementIds = evaluateAchievements(current, attempts, { quizzes, redemptions })
      return safeLearner(current)
    })
    return { learner: updated, reward: quest.reward }
  })

  app.post('/api/quiz/sessions', async (request, reply) => {
    const { session, learner } = requireLearner(request)
    const body = parse(quizCreateSchema, request.body ?? {})
    ensureDailyPractice(learner)
    if (learner.minutesPractisedToday >= learner.settings.dailyLimitMinutes) {
      throw new HttpError(429, 'Daily learning limit reached. Come back tomorrow!')
    }
    if (body.mode === 'speed-match' || body.mode === 'fill-blank') {
      if (!learner.settings.timedModesEnabled) throw new HttpError(403, 'Timed modes are disabled')
      if (learner.settings.focusMode && !learner.completedQuizToday) {
        throw new HttpError(403, 'Finish today’s quiz before playing mini-games')
      }
    }

    const attempts = attemptsForLearner(store, learner.id)
    const correctCount = attempts.filter((attempt) => attempt.correct).length
    const unlocks = mapUnlocks(correctCount, learner.level)
    if (body.mapStop && !unlocks[body.mapStop]) {
      throw new HttpError(403, 'This map stop is still locked')
    }

    const assignment = store.read((database) =>
      database.assignments
        .filter((item) => item.learnerId === learner.id)
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0],
    )

    const level = body.mapStop
      ? MAP_LEVELS[body.mapStop]
      : body.level ?? assignment?.level ?? learner.level

    const selected = selectVocabulary({
      count: body.count,
      level,
      category: body.category,
      categories: body.focusWordIds?.length || body.reviewOnly ? undefined : assignment?.categories,
      reviewMix: body.reviewOnly || body.focusWordIds?.length ? undefined : learner.settings.reviewMix,
      reviewOnly: body.reviewOnly,
      focusWordIds: body.focusWordIds,
      wordHealth: wordHealthSummaries(attempts),
    })
    if (!selected.length) throw new HttpError(404, 'No vocabulary matches this quiz')
    const quiz = {
      id: randomUUID(),
      userId: session.userId,
      learnerId: learner.id,
      mode: body.mode,
      wordIds: selected.map((word) => word.id),
      answeredWordIds: [],
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    }
    await store.update((database) => database.quizzes.push(quiz))
    return reply.code(201).send({
      id: quiz.id,
      mode: quiz.mode,
      expiresAt: quiz.expiresAt,
      settings: {
        hintsEnabled: learner.settings.hintsEnabled,
        soundEnabled: learner.settings.soundEnabled,
      },
      questions: selected.map(({ answer: _answer, fact: _fact, ...question }) => question),
    })
  })

  app.post('/api/quiz/sessions/:id/answers', async (request) => {
    const { session, learner } = requireLearner(request)
    const { id } = parse(idParams, request.params)
    const body = parse(quizAnswerSchema, request.body)
    const quiz = store.read((database) => database.quizzes.find((item) =>
      item.id === id && item.userId === session.userId && item.learnerId === learner.id,
    ))
    if (!quiz || Date.parse(quiz.expiresAt) <= Date.now()) throw new HttpError(404, 'Quiz session not found or expired')
    if (!quiz.wordIds.includes(body.wordId)) throw new HttpError(400, 'Word is not part of this quiz')
    if (quiz.answeredWordIds.includes(body.wordId)) throw new HttpError(409, 'Word has already been answered')
    const word = vocabulary.find((item) => item.id === body.wordId)
    if (!word) throw new HttpError(404, 'Word not found')
    const correct = body.answer.localeCompare(word.answer, undefined, { sensitivity: 'accent' }) === 0
    const priorWordAttempts = store.read((database) =>
      database.attempts.filter((item) => item.learnerId === learner.id && item.wordId === word.id),
    )
    const wasAtRisk = healthForAttempts(priorWordAttempts) === 'At risk'
    const result = await store.update((database) => {
      const currentQuiz = database.quizzes.find((item) => item.id === quiz.id)
      if (!currentQuiz || currentQuiz.answeredWordIds.includes(word.id)) throw new HttpError(409, 'Word has already been answered')
      currentQuiz.answeredWordIds.push(word.id)
      database.attempts.push({
        id: randomUUID(), learnerId: learner.id, wordId: word.id, correct, answeredAt: new Date().toISOString(),
      })
      const currentLearner = database.learners.find((item) => item.id === learner.id)
      let gemsAwarded = 0
      if (currentLearner) {
        ensureDailyPractice(currentLearner)
        currentLearner.minutesPractisedToday += 1
        const today = todayKey()
        const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)
        if (currentLearner.lastActiveDate !== today) {
          currentLearner.streak = currentLearner.lastActiveDate === yesterday
            ? currentLearner.streak + 1
            : 1
          currentLearner.lastActiveDate = today
        }
        if (correct) {
          const belowLevel = levelRank(word.level) < levelRank(currentLearner.level)
          const reward = currentQuiz.mode === 'fill-blank' || belowLevel ? 5 : 10
          currentLearner.gems += reward
          gemsAwarded = reward
        }
        const attempts = database.attempts.filter((item) => item.learnerId === learner.id)
        promoteLearnerLevel(currentLearner, attempts.filter((item) => item.correct).length)
        const wordAttempts = attempts.filter((item) => item.wordId === word.id)
        if (wasAtRisk && healthForAttempts(wordAttempts) === 'Healthy') {
          if (!currentLearner.achievementIds.includes('comeback_kid')) {
            currentLearner.achievementIds.push('comeback_kid')
          }
        }
        if (currentQuiz.answeredWordIds.length === currentQuiz.wordIds.length) {
          if (currentQuiz.mode === 'explorer') {
            currentLearner.completedQuizToday = true
            const quizAttempts = currentQuiz.wordIds.map((wordId) => {
              const matching = attempts
                .filter((item) => item.wordId === wordId)
                .sort((a, b) => Date.parse(b.answeredAt) - Date.parse(a.answeredAt))
              return matching[0]
            })
            const perfect = quizAttempts.every((attempt) => attempt?.correct)
            if (perfect) {
              currentLearner.perfectQuizCount = (currentLearner.perfectQuizCount ?? 0) + 1
            }
          }
          if (currentQuiz.mode === 'speed-match') {
            if (!currentLearner.achievementIds.includes('speed_runner')) {
              currentLearner.achievementIds.push('speed_runner')
            }
            const quizAttempts = currentQuiz.wordIds.map((wordId) => {
              const matching = attempts
                .filter((item) => item.wordId === wordId)
                .sort((a, b) => Date.parse(b.answeredAt) - Date.parse(a.answeredAt))
              return matching[0]
            })
            if (quizAttempts.every((attempt) => attempt?.correct)) {
              if (!currentLearner.achievementIds.includes('speed_perfect')) {
                currentLearner.achievementIds.push('speed_perfect')
              }
            }
          }
        }
        const quizzes = database.quizzes.filter((item) => item.learnerId === learner.id)
        const redemptions = database.redemptions.filter((item) => item.learnerId === learner.id)
        currentLearner.achievementIds = evaluateAchievements(currentLearner, attempts, { quizzes, redemptions })
      }
      return {
        correct,
        answer: word.answer,
        definition: word.definition,
        fact: word.fact,
        gemsAwarded,
        complete: currentQuiz.answeredWordIds.length === currentQuiz.wordIds.length,
      }
    })
    return result
  })

  app.get('/api/parent/dashboard', async (request) => {
    const session = requireParent(request)
    const learners = store.read((database) => database.learners.filter((item) => item.userId === session.userId))
    const learnerIds = learners.map((learner) => learner.id)
    const allAttempts = store.read((database) =>
      database.attempts.filter((attempt) => learnerIds.includes(attempt.learnerId)),
    )
    const dailyCounts = Array.from({ length: 7 }, (_, offset) => {
      const date = new Date(Date.now() - (6 - offset) * 86_400_000).toISOString().slice(0, 10)
      return allAttempts.filter((attempt) => attempt.answeredAt.slice(0, 10) === date).length
    })
    const peakDailyCount = Math.max(1, ...dailyCounts)
    const weekStart = new Date(Date.now() - 6 * 86_400_000).toISOString().slice(0, 10)
    const masteredThisWeek = new Set(
      allAttempts
        .filter((attempt) => attempt.correct && attempt.answeredAt.slice(0, 10) >= weekStart)
        .map((attempt) => attempt.wordId),
    ).size

    const levelCounts: Record<CambridgeLevel, number> = {
      Starters: 0, Movers: 0, Flyers: 0, Preliminary: 0,
    }
    for (const attempt of allAttempts) {
      const level = vocabulary.find((word) => word.id === attempt.wordId)?.level
      if (level) levelCounts[level] += 1
    }
    const levelPeak = Math.max(1, ...Object.values(levelCounts))

    return {
      activity: dailyCounts.map((count) => Math.round((count / peakDailyCount) * 100)),
      masteredThisWeek,
      masteryByLevel: (Object.entries(levelCounts) as Array<[CambridgeLevel, number]>).map(([label, count]) => ({
        label,
        value: Math.round((count / levelPeak) * 100),
        count,
      })),
      learners: learners.map((learner) => {
        const attempts = allAttempts.filter((item) => item.learnerId === learner.id)
        return {
          ...safeLearner(learner),
          settings: learner.settings,
          totalAnswers: attempts.length,
          accuracy: attempts.length
            ? Math.round(100 * attempts.filter((attempt) => attempt.correct).length / attempts.length)
            : 0,
          atRiskWords: [...new Set(attempts.map((attempt) => attempt.wordId))].filter((wordId) =>
            healthForAttempts(attempts.filter((attempt) => attempt.wordId === wordId)) === 'At risk',
          ).length,
        }
      }),
      wordHealth: vocabulary.flatMap((word) => {
        const attempts = allAttempts.filter((attempt) => attempt.wordId === word.id)
        if (!attempts.length) return []
        const lastActivity = attempts.at(-1)?.answeredAt ?? null
        return [{
          id: word.id,
          word: word.word,
          partOfSpeech: word.partOfSpeech,
          category: word.category,
          health: healthForAttempts(attempts),
          accuracy: Math.round(100 * attempts.filter((attempt) => attempt.correct).length / attempts.length),
          quizzes: attempts.length,
          lastActivity,
          lastActivityLabel: relativeTime(lastActivity),
        }]
      }),
      pendingRedemptions: store.read((database) => {
        const pending = database.redemptions.filter(
          (item) => item.userId === session.userId && item.status === 'pending',
        )
        return {
          count: pending.length,
          items: pending.map((item) => {
            const learner = learners.find((entry) => entry.id === item.learnerId)
            return {
              id: item.id,
              learnerId: item.learnerId,
              learnerName: learner?.nickname ?? 'Learner',
              giftId: item.giftId,
              giftName: item.giftName,
              costGems: item.costGems,
              status: item.status,
              createdAt: item.createdAt,
              learnerGems: learner?.gems ?? 0,
            }
          }),
        }
      }),
    }
  })

  app.get('/api/parent/gifts', async (request) => {
    const session = requireParent(request)
    return store.read((database) => {
      const user = database.users.find((item) => item.id === session.userId)
      if (!user) throw new HttpError(404, 'Account not found')
      const learners = database.learners.filter((item) => item.userId === session.userId)
      const pending = database.redemptions.filter(
        (item) => item.userId === session.userId && item.status === 'pending',
      )
      return {
        catalog: user.giftCatalog,
        pendingRedemptions: pending.map((item) => {
          const learner = learners.find((entry) => entry.id === item.learnerId)
          return {
            id: item.id,
            learnerId: item.learnerId,
            learnerName: learner?.nickname ?? 'Learner',
            giftId: item.giftId,
            giftName: item.giftName,
            costGems: item.costGems,
            status: item.status,
            createdAt: item.createdAt,
            learnerGems: learner?.gems ?? 0,
          }
        }),
      }
    })
  })

  app.put('/api/parent/gifts', async (request) => {
    const session = requireParent(request)
    const body = parse(giftCatalogSchema, request.body)
    const catalog = await store.update((database) => {
      const user = database.users.find((item) => item.id === session.userId)
      if (!user) throw new HttpError(404, 'Account not found')
      user.giftCatalog = body.gifts.map((gift) => ({
        id: gift.id ?? randomUUID(),
        name: gift.name,
        costGems: gift.costGems,
      }))
      return user.giftCatalog
    })
    return { catalog }
  })

  app.post('/api/parent/redemptions/:id/approve', async (request) => {
    const session = requireParent(request)
    const { id } = parse(idParams, request.params)
    const result = await store.update((database) => {
      const redemption = database.redemptions.find(
        (item) => item.id === id && item.userId === session.userId,
      )
      if (!redemption) throw new HttpError(404, 'Redemption not found')
      if (redemption.status !== 'pending') throw new HttpError(409, 'This request is no longer pending')
      const learner = database.learners.find(
        (item) => item.id === redemption.learnerId && item.userId === session.userId,
      )
      if (!learner) throw new HttpError(404, 'Learner not found')
      if (learner.gems < redemption.costGems) {
        throw new HttpError(400, 'Not enough gems to approve this gift')
      }
      learner.gems -= redemption.costGems
      redemption.status = 'approved'
      redemption.resolvedAt = new Date().toISOString()
      if (!learner.achievementIds.includes('gift_first')) {
        learner.achievementIds.push('gift_first')
      }
      const attempts = database.attempts.filter((item) => item.learnerId === learner.id)
      const quizzes = database.quizzes.filter((item) => item.learnerId === learner.id)
      const redemptions = database.redemptions.filter((item) => item.learnerId === learner.id)
      learner.achievementIds = evaluateAchievements(learner, attempts, { quizzes, redemptions })
      return {
        redemption: {
          id: redemption.id,
          learnerId: redemption.learnerId,
          learnerName: learner.nickname,
          giftId: redemption.giftId,
          giftName: redemption.giftName,
          costGems: redemption.costGems,
          status: redemption.status,
          createdAt: redemption.createdAt,
          resolvedAt: redemption.resolvedAt,
          learnerGems: learner.gems,
        },
        learner: safeLearner(learner),
      }
    })
    return result
  })

  app.post('/api/parent/redemptions/:id/reject', async (request) => {
    const session = requireParent(request)
    const { id } = parse(idParams, request.params)
    const redemption = await store.update((database) => {
      const current = database.redemptions.find(
        (item) => item.id === id && item.userId === session.userId,
      )
      if (!current) throw new HttpError(404, 'Redemption not found')
      if (current.status !== 'pending') throw new HttpError(409, 'This request is no longer pending')
      current.status = 'rejected'
      current.resolvedAt = new Date().toISOString()
      const learner = database.learners.find((item) => item.id === current.learnerId)
      return {
        id: current.id,
        learnerId: current.learnerId,
        learnerName: learner?.nickname ?? 'Learner',
        giftId: current.giftId,
        giftName: current.giftName,
        costGems: current.costGems,
        status: current.status,
        createdAt: current.createdAt,
        resolvedAt: current.resolvedAt,
        learnerGems: learner?.gems ?? 0,
      }
    })
    return { redemption }
  })

  app.get('/api/learner/gifts', async (request) => {
    const { session, learner } = requireLearner(request)
    return store.read((database) => {
      const user = database.users.find((item) => item.id === session.userId)
      if (!user) throw new HttpError(404, 'Account not found')
      const pending = database.redemptions.find(
        (item) => item.learnerId === learner.id && item.status === 'pending',
      )
      return {
        gems: learner.gems,
        catalog: user.giftCatalog,
        pending: pending
          ? {
              id: pending.id,
              learnerId: pending.learnerId,
              giftId: pending.giftId,
              giftName: pending.giftName,
              costGems: pending.costGems,
              status: pending.status,
              createdAt: pending.createdAt,
            }
          : null,
      }
    })
  })

  app.post('/api/learner/gifts/request', async (request, reply) => {
    const { session, learner } = requireLearner(request)
    const body = parse(giftRequestSchema, request.body)
    const redemption = await store.update((database) => {
      const user = database.users.find((item) => item.id === session.userId)
      if (!user) throw new HttpError(404, 'Account not found')
      const gift = user.giftCatalog.find((item) => item.id === body.giftId)
      if (!gift) throw new HttpError(404, 'Gift not found')
      const currentLearner = database.learners.find((item) => item.id === learner.id)
      if (!currentLearner) throw new HttpError(404, 'Learner not found')
      const alreadyPending = database.redemptions.some(
        (item) => item.learnerId === learner.id && item.status === 'pending',
      )
      if (alreadyPending) throw new HttpError(409, 'You already have a pending gift request')
      if (currentLearner.gems < gift.costGems) {
        throw new HttpError(400, 'Not enough gems for this gift')
      }
      const record = {
        id: randomUUID(),
        userId: session.userId,
        learnerId: learner.id,
        giftId: gift.id,
        giftName: gift.name,
        costGems: gift.costGems,
        status: 'pending' as const,
        createdAt: new Date().toISOString(),
      }
      database.redemptions.push(record)
      return record
    })
    return reply.code(201).send({
      redemption: {
        id: redemption.id,
        learnerId: redemption.learnerId,
        giftId: redemption.giftId,
        giftName: redemption.giftName,
        costGems: redemption.costGems,
        status: redemption.status,
        createdAt: redemption.createdAt,
      },
    })
  })

  app.post('/api/learner/gifts/cancel', async (request) => {
    const { learner } = requireLearner(request)
    const redemption = await store.update((database) => {
      const current = database.redemptions.find(
        (item) => item.learnerId === learner.id && item.status === 'pending',
      )
      if (!current) throw new HttpError(404, 'No pending gift request')
      current.status = 'cancelled'
      current.resolvedAt = new Date().toISOString()
      return {
        id: current.id,
        learnerId: current.learnerId,
        giftId: current.giftId,
        giftName: current.giftName,
        costGems: current.costGems,
        status: current.status,
        createdAt: current.createdAt,
        resolvedAt: current.resolvedAt,
      }
    })
    return { redemption }
  })

  app.get('/api/settings', async (request) => {
    requireParent(request)
    const { learner } = requireLearner(request)
    return { settings: learner.settings }
  })

  app.patch('/api/settings', async (request) => {
    requireParent(request)
    const { learner } = requireLearner(request)
    const body = parse(settingsSchema, request.body)
    const settings = await store.update((database) => {
      const current = database.learners.find((item) => item.id === learner.id)
      if (!current) throw new HttpError(404, 'Learner not found')
      current.settings = { ...current.settings, ...body }
      return current.settings
    })
    return { settings }
  })

  app.get('/api/curriculum/assignments', async (request) => {
    const session = requireParent(request)
    return {
      assignments: store.read((database) =>
        database.assignments.filter((assignment) => assignment.userId === session.userId),
      ),
    }
  })

  app.post('/api/curriculum/assignments', async (request, reply) => {
    const session = requireParent(request)
    const body = parse(assignmentSchema, request.body)
    const ownsLearner = store.read((database) =>
      database.learners.some((learner) => learner.id === body.learnerId && learner.userId === session.userId),
    )
    if (!ownsLearner) throw new HttpError(404, 'Learner not found')
    const assignment = {
      id: randomUUID(),
      userId: session.userId,
      ...body,
      createdAt: new Date().toISOString(),
    }
    await store.update((database) => database.assignments.push(assignment))
    return reply.code(201).send({ assignment })
  })

  app.get('/api/parent/word-health.csv', async (request, reply) => {
    const session = requireParent(request)
    const learnerIds = store.read((database) =>
      database.learners.filter((learner) => learner.userId === session.userId).map((learner) => learner.id),
    )
    const attempts = store.read((database) =>
      database.attempts.filter((attempt) => learnerIds.includes(attempt.learnerId)),
    )
    const rows = [['Learner ID', 'Word', 'Level', 'Health', 'Attempts', 'Accuracy']]
    for (const learnerId of learnerIds) {
      for (const word of vocabulary) {
        const relevant = attempts.filter((attempt) => attempt.learnerId === learnerId && attempt.wordId === word.id)
        if (!relevant.length) continue
        rows.push([
          learnerId,
          word.word,
          word.level,
          healthForAttempts(relevant),
          String(relevant.length),
          String(Math.round(100 * relevant.filter((attempt) => attempt.correct).length / relevant.length)),
        ])
      }
    }
    const csv = `${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}\r\n`
    return reply
      .header('content-type', 'text/csv; charset=utf-8')
      .header('content-disposition', 'attachment; filename="word-health.csv"')
      .send(csv)
  })

  app.get('/api/parent/weekly-report.csv', async (request, reply) => {
    const session = requireParent(request)
    const learners = store.read((database) => database.learners.filter((item) => item.userId === session.userId))
    const learnerIds = learners.map((learner) => learner.id)
    const allAttempts = store.read((database) =>
      database.attempts.filter((attempt) => learnerIds.includes(attempt.learnerId)),
    )
    const generatedAt = new Date().toISOString()
    const weekStart = new Date(Date.now() - 6 * 86_400_000).toISOString().slice(0, 10)
    const weekEnd = new Date().toISOString().slice(0, 10)
    const rows: string[][] = [
      ['Section', 'Field', 'Value'],
      ['Meta', 'Generated At', generatedAt],
      ['Meta', 'Week Start', weekStart],
      ['Meta', 'Week End', weekEnd],
    ]

    for (const learner of learners) {
      const attempts = allAttempts.filter((item) => item.learnerId === learner.id)
      const weekAttempts = attempts.filter((attempt) => attempt.answeredAt.slice(0, 10) >= weekStart)
      const masteredThisWeek = new Set(
        weekAttempts.filter((attempt) => attempt.correct).map((attempt) => attempt.wordId),
      ).size
      const atRiskWords = [...new Set(attempts.map((attempt) => attempt.wordId))].filter((wordId) =>
        healthForAttempts(attempts.filter((attempt) => attempt.wordId === wordId)) === 'At risk',
      ).length
      const safe = safeLearner(learner)
      rows.push(
        ['Learner', 'Name', safe.name],
        ['Learner', 'Streak', String(safe.streak)],
        ['Learner', 'Total Answers', String(attempts.length)],
        ['Learner', 'Accuracy', attempts.length
          ? String(Math.round(100 * attempts.filter((attempt) => attempt.correct).length / attempts.length))
          : '0'],
        ['Learner', 'Answers This Week', String(weekAttempts.length)],
        ['Learner', 'Correct This Week', String(weekAttempts.filter((attempt) => attempt.correct).length)],
        ['Learner', 'Words Mastered This Week', String(masteredThisWeek)],
        ['Learner', 'At Risk Words', String(atRiskWords)],
      )
    }

    for (let offset = 0; offset < 7; offset += 1) {
      const date = new Date(Date.now() - (6 - offset) * 86_400_000).toISOString().slice(0, 10)
      const count = allAttempts.filter((attempt) => attempt.answeredAt.slice(0, 10) === date).length
      rows.push(['Daily Activity', date, String(count)])
    }

    const csv = `${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}\r\n`
    return reply
      .header('content-type', 'text/csv; charset=utf-8')
      .header('content-disposition', 'attachment; filename="weekly-report.csv"')
      .send(csv)
  })

  return app
}
