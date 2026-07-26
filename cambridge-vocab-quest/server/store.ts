import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { CambridgeLevel, WordHealth } from '../shared/types.js'

export interface GiftDefinition {
  id: string
  name: string
  costGems: number
}

export interface UserRecord {
  id: string
  name: string
  email: string
  passwordHash: string
  createdAt: string
  giftCatalog: GiftDefinition[]
}

export type RedemptionStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

export interface RedemptionRecord {
  id: string
  userId: string
  learnerId: string
  giftId: string
  giftName: string
  costGems: number
  status: RedemptionStatus
  createdAt: string
  resolvedAt?: string
}

export interface LearnerSettings {
  dailyGoal: number
  dailyLimitMinutes: 15 | 30 | 45 | 60
  reviewMix: 10 | 25 | 40
  timedModesEnabled: boolean
  focusMode: boolean
  soundEnabled: boolean
  hintsEnabled: boolean
}

export interface LearnerRecord {
  id: string
  userId: string
  nickname: string
  avatar: string
  level: CambridgeLevel
  pinHash?: string
  streak: number
  stars: number
  gems: number
  lastActiveDate?: string
  claimedQuestIds: string[]
  achievementIds: string[]
  /** Count of Explorer quizzes finished with every answer correct. */
  perfectQuizCount: number
  minutesPractisedToday: number
  minutesPractisedDate?: string
  completedQuizToday: boolean
  settings: LearnerSettings
  createdAt: string
}

export interface SessionRecord {
  tokenHash: string
  userId: string
  selectedLearnerId?: string
  parentVerifiedUntil?: string
  expiresAt: string
}

export interface QuizRecord {
  id: string
  userId: string
  learnerId: string
  mode: 'explorer' | 'speed-match' | 'fill-blank'
  wordIds: string[]
  answeredWordIds: string[]
  createdAt: string
  expiresAt: string
}

export interface AttemptRecord {
  id: string
  learnerId: string
  wordId: string
  correct: boolean
  answeredAt: string
}

export interface AssignmentRecord {
  id: string
  userId: string
  learnerId: string
  level: CambridgeLevel
  categories: string[]
  dueDate?: string
  createdAt: string
}

export interface PasswordResetRecord {
  email: string
  tokenHash: string
  expiresAt: string
}

export interface Database {
  version: 2
  users: UserRecord[]
  learners: LearnerRecord[]
  sessions: SessionRecord[]
  quizzes: QuizRecord[]
  attempts: AttemptRecord[]
  assignments: AssignmentRecord[]
  passwordResets: PasswordResetRecord[]
  redemptions: RedemptionRecord[]
}

export const defaultSettings = (): LearnerSettings => ({
  dailyGoal: 10,
  dailyLimitMinutes: 45,
  reviewMix: 25,
  timedModesEnabled: true,
  focusMode: false,
  soundEnabled: true,
  hintsEnabled: true,
})

export const emptyDatabase = (): Database => ({
  version: 2,
  users: [],
  learners: [],
  sessions: [],
  quizzes: [],
  attempts: [],
  assignments: [],
  passwordResets: [],
  redemptions: [],
})

function normalizeGift(raw: Partial<GiftDefinition> & Pick<GiftDefinition, 'id' | 'name' | 'costGems'>): GiftDefinition {
  return {
    id: raw.id,
    name: raw.name,
    costGems: raw.costGems,
  }
}

function normalizeUser(raw: Partial<UserRecord> & Pick<UserRecord, 'id' | 'name' | 'email' | 'passwordHash' | 'createdAt'>): UserRecord {
  return {
    id: raw.id,
    name: raw.name,
    email: raw.email,
    passwordHash: raw.passwordHash,
    createdAt: raw.createdAt,
    giftCatalog: (raw.giftCatalog ?? []).map((gift) => normalizeGift(gift as GiftDefinition)),
  }
}

function normalizeRedemption(raw: Partial<RedemptionRecord> & Pick<RedemptionRecord, 'id' | 'userId' | 'learnerId' | 'giftId' | 'giftName' | 'costGems' | 'status' | 'createdAt'>): RedemptionRecord {
  return {
    id: raw.id,
    userId: raw.userId,
    learnerId: raw.learnerId,
    giftId: raw.giftId,
    giftName: raw.giftName,
    costGems: raw.costGems,
    status: raw.status,
    createdAt: raw.createdAt,
    resolvedAt: raw.resolvedAt,
  }
}

function normalizeLearner(raw: Partial<LearnerRecord> & Pick<LearnerRecord, 'id' | 'userId' | 'nickname' | 'avatar' | 'level' | 'createdAt'>): LearnerRecord {
  return {
    id: raw.id,
    userId: raw.userId,
    nickname: raw.nickname,
    avatar: raw.avatar,
    level: raw.level,
    pinHash: raw.pinHash,
    streak: raw.streak ?? 0,
    stars: raw.stars ?? 0,
    gems: raw.gems ?? 0,
    lastActiveDate: raw.lastActiveDate,
    claimedQuestIds: raw.claimedQuestIds ?? [],
    achievementIds: raw.achievementIds ?? [],
    perfectQuizCount: raw.perfectQuizCount ?? 0,
    minutesPractisedToday: raw.minutesPractisedToday ?? 0,
    minutesPractisedDate: raw.minutesPractisedDate,
    completedQuizToday: raw.completedQuizToday ?? false,
    settings: { ...defaultSettings(), ...raw.settings },
    createdAt: raw.createdAt,
  }
}

export function migrateDatabase(raw: Partial<Database> & { version?: number }): Database {
  const base = emptyDatabase()
  return {
    version: 2,
    users: (raw.users ?? []).map((user) => normalizeUser(user as UserRecord)),
    learners: (raw.learners ?? []).map((learner) => normalizeLearner(learner as LearnerRecord)),
    sessions: raw.sessions ?? [],
    quizzes: (raw.quizzes ?? []).map((quiz) => ({
      ...(quiz as QuizRecord),
      mode: (quiz as QuizRecord).mode ?? 'explorer',
    })),
    attempts: raw.attempts ?? [],
    assignments: raw.assignments ?? [],
    passwordResets: raw.passwordResets ?? base.passwordResets,
    redemptions: (raw.redemptions ?? []).map((item) => normalizeRedemption(item as RedemptionRecord)),
  }
}

export interface DataStore {
  readonly filePath: string
  init(): Promise<void>
  read<T>(reader: (database: Readonly<Database>) => T): T
  update<T>(mutator: (database: Database) => T | Promise<T>): Promise<T>
  reset(next?: Database): Promise<void>
}

export class JsonStore implements DataStore {
  readonly filePath: string
  private data: Database = emptyDatabase()
  private operation = Promise.resolve()

  constructor(filePath = process.env.DATA_FILE ?? resolve(process.cwd(), 'server', 'data', 'database.json')) {
    this.filePath = filePath
  }

  async init(): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true })
    try {
      const parsed = JSON.parse(await readFile(this.filePath, 'utf8')) as Database
      this.data = migrateDatabase(parsed)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      await this.persist()
    }
  }

  read<T>(reader: (database: Readonly<Database>) => T): T {
    return reader(this.data)
  }

  async update<T>(mutator: (database: Database) => T | Promise<T>): Promise<T> {
    let result!: T
    const run = async () => {
      const draft = structuredClone(this.data)
      result = await mutator(draft)
      await this.persist(draft)
      this.data = draft
    }
    this.operation = this.operation.then(run, run)
    await this.operation
    return result
  }

  async reset(next: Database = emptyDatabase()): Promise<void> {
    await this.update((database) => Object.assign(database, structuredClone(migrateDatabase(next))))
  }

  private async persist(database: Database = this.data): Promise<void> {
    const temporary = `${this.filePath}.${process.pid}.${randomUUID()}.tmp`
    await writeFile(temporary, `${JSON.stringify(database, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 })
    await rename(temporary, this.filePath)
  }
}

export function healthForAttempts(attempts: AttemptRecord[]): WordHealth {
  if (attempts.length === 0) return 'New'
  const recent = attempts.slice(-5)
  const accuracy = recent.filter((attempt) => attempt.correct).length / recent.length
  if (recent.length < 3) return 'Warming'
  return accuracy >= 0.8 ? 'Healthy' : 'At risk'
}

export function todayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10)
}

export function ensureDailyPractice(learner: LearnerRecord, now = new Date()): void {
  const today = todayKey(now)
  if (learner.minutesPractisedDate !== today) {
    learner.minutesPractisedDate = today
    learner.minutesPractisedToday = 0
    learner.completedQuizToday = false
    learner.claimedQuestIds = []
  }
}
