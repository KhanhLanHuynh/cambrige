import { randomUUID } from 'node:crypto'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { createParent } from './admin-parent.js'
import { buildApp } from './app.js'
import { JsonStore, type DataStore } from './store.js'

const directories: string[] = []
const DEFAULT_PASSWORD = 'A-secure-password1'

async function testApp() {
  const directory = await mkdtemp(join(tmpdir(), 'cvq-'))
  directories.push(directory)
  const store = new JsonStore(join(directory, 'database.json'))
  const app = await buildApp({ store })
  return { app, store }
}

async function testAppWithStore() {
  return testApp()
}

async function signInAsParent(
  app: FastifyInstance,
  store: DataStore,
  options: { name?: string; email: string; password?: string },
) {
  const password = options.password ?? DEFAULT_PASSWORD
  await createParent(store, {
    name: options.name ?? 'Parent',
    email: options.email,
    password,
  })
  const login = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { email: options.email.toLowerCase(), password },
  })
  expect(login.statusCode).toBe(200)
  return `${login.cookies[0]?.name}=${login.cookies[0]?.value}`
}

async function finishSession(
  app: FastifyInstance,
  cookie: string,
  vocabulary: Array<{ id: string; answer: string }>,
  payload: Record<string, unknown>,
) {
  const quizResponse = await app.inject({
    method: 'POST',
    url: '/api/quiz/sessions',
    headers: { cookie },
    payload,
  })
  expect(quizResponse.statusCode).toBe(201)
  const quiz = quizResponse.json() as { id: string; questions: Array<{ id: string }> }
  for (const word of quiz.questions) {
    const answer = vocabulary.find((item) => item.id === word.id)?.answer
    expect(answer).toBeTruthy()
    const answered = await app.inject({
      method: 'POST',
      url: `/api/quiz/sessions/${quiz.id}/answers`,
      headers: { cookie },
      payload: { wordId: word.id, answer },
    })
    expect(answered.statusCode).toBe(200)
  }
  return quiz
}

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })))
})

describe('Cambridge Vocab Quest API', () => {
  it('rejects public registration and signs in a host-created parent', async () => {
    const { app, store } = await testApp()
    const blocked = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { name: 'Parent', email: 'parent@example.com', password: 'A-secure-password1' },
    })
    expect(blocked.statusCode).toBe(404)

    const cookie = await signInAsParent(app, store, { name: 'Parent', email: 'parent@example.com' })

    const creation = await app.inject({
      method: 'POST',
      url: '/api/learners',
      headers: { cookie },
      payload: { name: 'Explorer', avatar: 'fox', level: 'Movers', pin: '2468' },
    })
    expect(creation.statusCode).toBe(201)
    expect(creation.json().learner).toMatchObject({ name: 'Explorer', hasPin: true })
    expect(creation.body).not.toContain('pinHash')
    expect(creation.body).not.toContain('2468')
    await app.close()
  }, 20_000)

  it('allows private LAN Vite origins when CORS_ORIGINS is unset', async () => {
    const { app } = await testApp()
    const lan = await app.inject({
      method: 'GET',
      url: '/api/health',
      headers: { origin: 'http://192.168.1.23:5173' },
    })
    expect(lan.statusCode).toBe(200)
    expect(lan.headers['access-control-allow-origin']).toBe('http://192.168.1.23:5173')

    const blocked = await app.inject({
      method: 'GET',
      url: '/api/health',
      headers: { origin: 'http://example.com:5173' },
    })
    expect(blocked.statusCode).toBe(200)
    expect(blocked.headers['access-control-allow-origin']).toBeUndefined()
    await app.close()
  })

  it('rejects creating more than 5 learners for one parent', async () => {
    const { app, store } = await testApp()
    const cookie = await signInAsParent(app, store, { name: 'Parent', email: 'max-learners@example.com' })

    for (let index = 1; index <= 5; index++) {
      const creation = await app.inject({
        method: 'POST',
        url: '/api/learners',
        headers: { cookie },
        payload: { name: `Learner ${index}`, level: 'Starters' },
      })
      expect(creation.statusCode).toBe(201)
    }

    const blocked = await app.inject({
      method: 'POST',
      url: '/api/learners',
      headers: { cookie },
      payload: { name: 'Learner 6', level: 'Starters' },
    })
    expect(blocked.statusCode).toBe(409)
    expect(blocked.json().error).toBe('Maximum of 5 learners allowed')
    await app.close()
  }, 20_000)

  it('requires the learner PIN and accepts a quiz answer once', async () => {
    const { app, store } = await testApp()
    const cookie = await signInAsParent(app, store, { name: 'Parent', email: 'quiz@example.com' })
    const creation = await app.inject({
      method: 'POST',
      url: '/api/learners',
      headers: { cookie },
      payload: { name: 'Explorer', level: 'Movers', pin: '2468' },
    })
    const learnerId = creation.json().learner.id

    const rejected = await app.inject({
      method: 'POST',
      url: '/api/learners/select',
      headers: { cookie },
      payload: { learnerId, pin: '1111' },
    })
    expect(rejected.statusCode).toBe(401)

    const selected = await app.inject({
      method: 'POST',
      url: '/api/learners/select',
      headers: { cookie },
      payload: { learnerId, pin: '2468' },
    })
    expect(selected.statusCode).toBe(200)

    const quizResponse = await app.inject({
      method: 'POST',
      url: '/api/quiz/sessions',
      headers: { cookie },
      payload: { count: 1 },
    })
    const quiz = quizResponse.json()
    expect(quiz.questions[0]).not.toHaveProperty('answer')

    const answer = await app.inject({
      method: 'POST',
      url: `/api/quiz/sessions/${quiz.id}/answers`,
      headers: { cookie },
      payload: { wordId: quiz.questions[0].id, answer: quiz.questions[0].choices[0] },
    })
    expect(answer.statusCode).toBe(200)
    const repeated = await app.inject({
      method: 'POST',
      url: `/api/quiz/sessions/${quiz.id}/answers`,
      headers: { cookie },
      payload: { wordId: quiz.questions[0].id, answer: quiz.questions[0].choices[0] },
    })
    expect(repeated.statusCode).toBe(409)
    await app.close()
  }, 20_000)

  it('awards half gems when a higher-level learner practices a lower-level stop', async () => {
    const { vocabulary } = await import('./vocabulary.js')
    const { app, store } = await testApp()
    const cookie = await signInAsParent(app, store, { name: 'Parent', email: 'half-gems@example.com' })
    const creation = await app.inject({
      method: 'POST',
      url: '/api/learners',
      headers: { cookie },
      payload: { name: 'Explorer', level: 'Movers' },
    })
    const learnerId = creation.json().learner.id
    await app.inject({
      method: 'POST',
      url: '/api/learners/select',
      headers: { cookie },
      payload: { learnerId },
    })

    const startersQuiz = await app.inject({
      method: 'POST',
      url: '/api/quiz/sessions',
      headers: { cookie },
      payload: { count: 1, level: 'Starters' },
    })
    expect(startersQuiz.statusCode).toBe(201)
    const startersQuestion = startersQuiz.json().questions[0]
    const startersAnswer = vocabulary.find((item) => item.id === startersQuestion.id)?.answer
    expect(startersAnswer).toBeTruthy()
    const startersResult = await app.inject({
      method: 'POST',
      url: `/api/quiz/sessions/${startersQuiz.json().id}/answers`,
      headers: { cookie },
      payload: { wordId: startersQuestion.id, answer: startersAnswer },
    })
    expect(startersResult.statusCode).toBe(200)
    expect(startersResult.json().gemsAwarded).toBe(5)

    const moversQuiz = await app.inject({
      method: 'POST',
      url: '/api/quiz/sessions',
      headers: { cookie },
      payload: { count: 1, level: 'Movers' },
    })
    expect(moversQuiz.statusCode).toBe(201)
    const moversQuestion = moversQuiz.json().questions[0]
    const moversAnswer = vocabulary.find((item) => item.id === moversQuestion.id)?.answer
    expect(moversAnswer).toBeTruthy()
    const moversResult = await app.inject({
      method: 'POST',
      url: `/api/quiz/sessions/${moversQuiz.json().id}/answers`,
      headers: { cookie },
      payload: { wordId: moversQuestion.id, answer: moversAnswer },
    })
    expect(moversResult.statusCode).toBe(200)
    expect(moversResult.json().gemsAwarded).toBe(10)

    const hub = await app.inject({ method: 'GET', url: '/api/learner/hub', headers: { cookie } })
    expect(hub.json().learner.gems).toBe(15)
    await app.close()
  }, 20_000)

  it('requires adult password verification after entering learner mode', async () => {
    const { app, store } = await testApp()
    const cookie = await signInAsParent(app, store, { name: 'Parent', email: 'gate@example.com' })
    const creation = await app.inject({
      method: 'POST',
      url: '/api/learners',
      headers: { cookie },
      payload: { name: 'Explorer', level: 'Flyers' },
    })
    await app.inject({
      method: 'POST',
      url: '/api/learners/select',
      headers: { cookie },
      payload: { learnerId: creation.json().learner.id },
    })

    expect((await app.inject({ method: 'GET', url: '/api/parent/dashboard', headers: { cookie } })).statusCode).toBe(403)
    expect((await app.inject({
      method: 'POST',
      url: '/api/auth/parent-gate',
      headers: { cookie },
      payload: { password: 'wrong-password' },
    })).statusCode).toBe(401)
    expect((await app.inject({
      method: 'POST',
      url: '/api/auth/parent-gate',
      headers: { cookie },
      payload: { password: 'A-secure-password1' },
    })).statusCode).toBe(200)
    expect((await app.inject({ method: 'GET', url: '/api/parent/dashboard', headers: { cookie } })).statusCode).toBe(200)
    const weeklyReport = await app.inject({ method: 'GET', url: '/api/parent/weekly-report.csv', headers: { cookie } })
    expect(weeklyReport.statusCode).toBe(200)
    expect(weeklyReport.headers['content-type']).toContain('text/csv')
    expect(weeklyReport.body).toContain('"Section","Field","Value"')
    expect(weeklyReport.body).toContain('Explorer')
    expect(weeklyReport.body).toContain('Words Mastered This Week')
    expect(weeklyReport.body).toContain('Daily Activity')
    await app.close()
  }, 20_000)

  it('patches settings for every learner on the parent account', async () => {
    const { app, store } = await testApp()
    const cookie = await signInAsParent(app, store, { name: 'Parent', email: 'settings-multi@example.com' })
    const first = await app.inject({
      method: 'POST',
      url: '/api/learners',
      headers: { cookie },
      payload: { name: 'Ada', level: 'Starters' },
    })
    const second = await app.inject({
      method: 'POST',
      url: '/api/learners',
      headers: { cookie },
      payload: { name: 'Ben', level: 'Movers' },
    })
    const adaId = first.json().learner.id as string
    const benId = second.json().learner.id as string

    await app.inject({
      method: 'POST',
      url: '/api/learners/select',
      headers: { cookie },
      payload: { learnerId: adaId },
    })
    await app.inject({
      method: 'POST',
      url: '/api/auth/parent-gate',
      headers: { cookie },
      payload: { password: 'A-secure-password1' },
    })

    const patch = await app.inject({
      method: 'PATCH',
      url: '/api/settings',
      headers: { cookie },
      payload: {
        dailyLimitMinutes: 15,
        focusMode: true,
        hintsEnabled: false,
        speedMatchSeconds: 45,
      },
    })
    expect(patch.statusCode).toBe(200)
    expect(patch.json().settings).toMatchObject({
      dailyLimitMinutes: 15,
      focusMode: true,
      hintsEnabled: false,
      speedMatchSeconds: 45,
    })

    const getBen = await app.inject({
      method: 'GET',
      url: `/api/settings?learnerId=${benId}`,
      headers: { cookie },
    })
    expect(getBen.statusCode).toBe(200)
    expect(getBen.json().settings).toMatchObject({
      dailyLimitMinutes: 15,
      focusMode: true,
      hintsEnabled: false,
      speedMatchSeconds: 45,
    })

    const getAda = await app.inject({
      method: 'GET',
      url: `/api/settings?learnerId=${adaId}`,
      headers: { cookie },
    })
    expect(getAda.statusCode).toBe(200)
    expect(getAda.json().settings).toMatchObject({
      dailyLimitMinutes: 15,
      focusMode: true,
      hintsEnabled: false,
      speedMatchSeconds: 45,
    })

    const emptyParent = await signInAsParent(app, store, { name: 'Empty', email: 'settings-empty@example.com' })
    await app.inject({
      method: 'POST',
      url: '/api/auth/parent-gate',
      headers: { cookie: emptyParent },
      payload: { password: 'A-secure-password1' },
    })
    const noLearners = await app.inject({
      method: 'PATCH',
      url: '/api/settings',
      headers: { cookie: emptyParent },
      payload: { focusMode: true },
    })
    expect(noLearners.statusCode).toBe(409)

    await app.close()
  }, 20_000)

  it('claims a completed daily quest reward once', async () => {
    const { vocabulary } = await import('./vocabulary.js')
    const { app, store } = await testApp()
    const cookie = await signInAsParent(app, store, { name: 'Parent', email: 'quest@example.com' })
    const creation = await app.inject({
      method: 'POST',
      url: '/api/learners',
      headers: { cookie },
      payload: { name: 'Explorer', level: 'Starters' },
    })
    await app.inject({
      method: 'POST',
      url: '/api/learners/select',
      headers: { cookie },
      payload: { learnerId: creation.json().learner.id },
    })

    const hubBefore = await app.inject({ method: 'GET', url: '/api/learner/hub', headers: { cookie } })
    expect(hubBefore.json().quests.find((quest: { id: string }) => quest.id === 'focus')).toMatchObject({
      label: 'Finish 1 Starters quiz or mini-game',
      progress: 0,
    })
    expect(hubBefore.json().quests.find((quest: { id: string }) => quest.id === 'play')).toMatchObject({
      label: 'Play 1 mini-game',
      progress: 0,
    })
    expect(hubBefore.json().quests.find((quest: { id: string }) => quest.id === 'play-all')).toMatchObject({
      label: 'Play all 3 mini-games',
      progress: 0,
    })

    await finishSession(app, cookie, vocabulary, { count: 1, level: 'Starters' })

    const hubAfter = await app.inject({ method: 'GET', url: '/api/learner/hub', headers: { cookie } })
    expect(hubAfter.json().quests.find((quest: { id: string }) => quest.id === 'focus')).toMatchObject({
      progress: 1,
    })
    expect(hubAfter.json().quests.find((quest: { id: string }) => quest.id === 'play')).toMatchObject({
      progress: 0,
    })
    expect(hubAfter.json().quests.find((quest: { id: string }) => quest.id === 'play-all')).toMatchObject({
      progress: 0,
    })

    const claim = await app.inject({
      method: 'POST',
      url: '/api/learner/quests/claim',
      headers: { cookie },
      payload: { questId: 'focus' },
    })
    expect(claim.statusCode).toBe(200)
    expect(claim.json().reward).toBe(30)

    const again = await app.inject({
      method: 'POST',
      url: '/api/learner/quests/claim',
      headers: { cookie },
      payload: { questId: 'focus' },
    })
    expect(again.statusCode).toBe(409)
    await app.close()
  }, 20_000)

  it('adapts focus quest to Movers after Space Station unlocks', async () => {
    const { randomUUID } = await import('node:crypto')
    const { vocabulary } = await import('./vocabulary.js')
    const directory = await mkdtemp(join(tmpdir(), 'cvq-'))
    directories.push(directory)
    const store = new JsonStore(join(directory, 'database.json'))
    const app = await buildApp({ store })

    const cookie = await signInAsParent(app, store, { name: 'Parent', email: 'adaptive-quest@example.com' })
    const creation = await app.inject({
      method: 'POST',
      url: '/api/learners',
      headers: { cookie },
      payload: { name: 'Explorer', level: 'Starters' },
    })
    const learnerId = creation.json().learner.id
    await app.inject({
      method: 'POST',
      url: '/api/learners/select',
      headers: { cookie },
      payload: { learnerId },
    })

    const startersWord = vocabulary.find((item) => item.level === 'Starters')
    expect(startersWord).toBeTruthy()
    await store.update((database) => {
      for (let index = 0; index < 200; index += 1) {
        database.attempts.push({
          id: randomUUID(),
          learnerId,
          wordId: startersWord!.id,
          correct: true,
          answeredAt: '2020-01-01T12:00:00.000Z',
        })
      }
    })

    const hub = await app.inject({ method: 'GET', url: '/api/learner/hub', headers: { cookie } })
    expect(hub.statusCode).toBe(200)
    expect(hub.json().map.unlocks['space-station']).toBe(true)
    expect(hub.json().quests.find((quest: { id: string }) => quest.id === 'focus')).toMatchObject({
      label: 'Finish 1 Movers quiz or mini-game',
      progress: 0,
    })
    expect(hub.json().quests.find((quest: { id: string }) => quest.id === 'play')).toMatchObject({
      label: 'Play 1 mini-game',
      progress: 0,
    })
    expect(hub.json().quests.find((quest: { id: string }) => quest.id === 'streak')).toMatchObject({
      label: 'Maintain a 5-answer Movers streak',
      progress: 0,
    })

    await finishSession(app, cookie, vocabulary, { count: 1, level: 'Starters' })

    const hubAfterStarters = await app.inject({ method: 'GET', url: '/api/learner/hub', headers: { cookie } })
    expect(hubAfterStarters.json().quests.find((quest: { id: string }) => quest.id === 'focus')).toMatchObject({
      progress: 1,
    })
    expect(hubAfterStarters.json().quests.find((quest: { id: string }) => quest.id === 'play')).toMatchObject({
      progress: 0,
    })
    expect(hubAfterStarters.json().quests.find((quest: { id: string }) => quest.id === 'streak')).toMatchObject({
      progress: 0,
    })

    const startersFocusClaim = await app.inject({
      method: 'POST',
      url: '/api/learner/quests/claim',
      headers: { cookie },
      payload: { questId: 'focus' },
    })
    expect(startersFocusClaim.statusCode).toBe(200)

    await finishSession(app, cookie, vocabulary, { count: 1, level: 'Movers' })

    const claim = await app.inject({
      method: 'POST',
      url: '/api/learner/quests/claim',
      headers: { cookie },
      payload: { questId: 'focus' },
    })
    expect(claim.statusCode).toBe(409)
    await app.close()
  }, 20_000)

  it('counts lower unlocked map practice when profile level is ahead of earned progress', async () => {
    const { vocabulary } = await import('./vocabulary.js')
    const { app, store } = await testApp()
    const cookie = await signInAsParent(app, store, { name: 'Parent', email: 'profile-ahead-quest@example.com' })
    const creation = await app.inject({
      method: 'POST',
      url: '/api/learners',
      headers: { cookie },
      payload: { name: 'Alan', level: 'Flyers' },
    })
    await app.inject({
      method: 'POST',
      url: '/api/learners/select',
      headers: { cookie },
      payload: { learnerId: creation.json().learner.id },
    })

    const hubBefore = await app.inject({ method: 'GET', url: '/api/learner/hub', headers: { cookie } })
    expect(hubBefore.json().quests.find((quest: { id: string }) => quest.id === 'focus')).toMatchObject({
      label: 'Finish 1 Flyers quiz or mini-game',
      progress: 0,
    })

    const moversQuiz = await app.inject({
      method: 'POST',
      url: '/api/quiz/sessions',
      headers: { cookie },
      payload: { count: 1, mapStop: 'space-station' },
    })
    expect(moversQuiz.statusCode).toBe(201)
    const moversQuestion = moversQuiz.json().questions[0]
    const moversAnswer = vocabulary.find((item) => item.id === moversQuestion.id)?.answer
    expect(moversAnswer).toBeTruthy()
    await app.inject({
      method: 'POST',
      url: `/api/quiz/sessions/${moversQuiz.json().id}/answers`,
      headers: { cookie },
      payload: { wordId: moversQuestion.id, answer: moversAnswer },
    })

    const hubAfter = await app.inject({ method: 'GET', url: '/api/learner/hub', headers: { cookie } })
    expect(hubAfter.json().quests.find((quest: { id: string }) => quest.id === 'focus')).toMatchObject({
      progress: 1,
    })
    const claim = await app.inject({
      method: 'POST',
      url: '/api/learner/quests/claim',
      headers: { cookie },
      payload: { questId: 'focus' },
    })
    expect(claim.statusCode).toBe(200)
    expect(claim.json().reward).toBe(30)
    await app.close()
  }, 20_000)

  it('claims all completed daily quests in one request', async () => {
    const { vocabulary } = await import('./vocabulary.js')
    const { app, store } = await testApp()
    const cookie = await signInAsParent(app, store, { name: 'Parent', email: 'claim-all@example.com' })
    const creation = await app.inject({
      method: 'POST',
      url: '/api/learners',
      headers: { cookie },
      payload: { name: 'Explorer', level: 'Starters' },
    })
    await app.inject({
      method: 'POST',
      url: '/api/learners/select',
      headers: { cookie },
      payload: { learnerId: creation.json().learner.id },
    })

    for (let index = 0; index < 5; index += 1) {
      await finishSession(app, cookie, vocabulary, { count: 1, level: 'Starters' })
    }
    await finishSession(app, cookie, vocabulary, { count: 1, mode: 'fill-blank', level: 'Starters' })
    await finishSession(app, cookie, vocabulary, { count: 1, mode: 'speed-match', level: 'Starters' })
    await finishSession(app, cookie, vocabulary, { count: 1, mode: 'swap-words', level: 'Starters' })

    const hub = await app.inject({ method: 'GET', url: '/api/learner/hub', headers: { cookie } })
    expect(hub.json().quests.every((quest: { progress: number; target: number }) => quest.progress >= quest.target)).toBe(true)

    const claimAll = await app.inject({
      method: 'POST',
      url: '/api/learner/quests/claim-all',
      headers: { cookie },
    })
    expect(claimAll.statusCode).toBe(200)
    expect(claimAll.json().reward).toBe(250)
    expect(claimAll.json().claimedQuestIds).toEqual(['focus', 'play', 'streak', 'play-all'])

    const again = await app.inject({
      method: 'POST',
      url: '/api/learner/quests/claim-all',
      headers: { cookie },
    })
    expect(again.statusCode).toBe(200)
    expect(again.json().reward).toBe(0)
    expect(again.json().claimedQuestIds).toEqual([])
    await app.close()
  }, 20_000)

  it.each(['fill-blank', 'speed-match', 'swap-words'] as const)(
    'completes focus and play after finishing a %s mini-game',
    async (mode) => {
      const { vocabulary } = await import('./vocabulary.js')
      const { app, store } = await testApp()
      const cookie = await signInAsParent(app, store, { name: 'Parent', email: `quest-${mode}@example.com` })
      const creation = await app.inject({
        method: 'POST',
        url: '/api/learners',
        headers: { cookie },
        payload: { name: 'Explorer', level: 'Starters' },
      })
      await app.inject({
        method: 'POST',
        url: '/api/learners/select',
        headers: { cookie },
        payload: { learnerId: creation.json().learner.id },
      })

      await finishSession(app, cookie, vocabulary, { count: 1, mode, level: 'Starters' })

      const hub = await app.inject({ method: 'GET', url: '/api/learner/hub', headers: { cookie } })
      expect(hub.json().quests.find((quest: { id: string }) => quest.id === 'focus')).toMatchObject({
        progress: 1,
      })
      expect(hub.json().quests.find((quest: { id: string }) => quest.id === 'play')).toMatchObject({
        progress: 1,
      })
      expect(hub.json().quests.find((quest: { id: string }) => quest.id === 'play-all')).toMatchObject({
        progress: 1,
      })

      const claimPlay = await app.inject({
        method: 'POST',
        url: '/api/learner/quests/claim',
        headers: { cookie },
        payload: { questId: 'play' },
      })
      expect(claimPlay.statusCode).toBe(200)
      expect(claimPlay.json().reward).toBe(50)
      await app.close()
    },
    20_000,
  )

  it('completes play-all after finishing all three mini-games', async () => {
    const { vocabulary } = await import('./vocabulary.js')
    const { app, store } = await testApp()
    const cookie = await signInAsParent(app, store, { name: 'Parent', email: 'quest-play-all@example.com' })
    const creation = await app.inject({
      method: 'POST',
      url: '/api/learners',
      headers: { cookie },
      payload: { name: 'Explorer', level: 'Starters' },
    })
    await app.inject({
      method: 'POST',
      url: '/api/learners/select',
      headers: { cookie },
      payload: { learnerId: creation.json().learner.id },
    })

    await finishSession(app, cookie, vocabulary, { count: 1, mode: 'fill-blank', level: 'Starters' })
    await finishSession(app, cookie, vocabulary, { count: 1, mode: 'speed-match', level: 'Starters' })
    await finishSession(app, cookie, vocabulary, { count: 1, mode: 'swap-words', level: 'Starters' })

    const hub = await app.inject({ method: 'GET', url: '/api/learner/hub', headers: { cookie } })
    expect(hub.json().quests.find((quest: { id: string }) => quest.id === 'play-all')).toMatchObject({
      progress: 3,
      target: 3,
    })

    const claim = await app.inject({
      method: 'POST',
      url: '/api/learner/quests/claim',
      headers: { cookie },
      payload: { questId: 'play-all' },
    })
    expect(claim.statusCode).toBe(200)
    expect(claim.json().reward).toBe(100)
    await app.close()
  }, 20_000)

  it('does not raise play-all when repeating the same mini-game', async () => {
    const { vocabulary } = await import('./vocabulary.js')
    const { app, store } = await testApp()
    const cookie = await signInAsParent(app, store, { name: 'Parent', email: 'quest-repeat-game@example.com' })
    const creation = await app.inject({
      method: 'POST',
      url: '/api/learners',
      headers: { cookie },
      payload: { name: 'Explorer', level: 'Starters' },
    })
    await app.inject({
      method: 'POST',
      url: '/api/learners/select',
      headers: { cookie },
      payload: { learnerId: creation.json().learner.id },
    })

    await finishSession(app, cookie, vocabulary, { count: 1, mode: 'fill-blank', level: 'Starters' })
    await finishSession(app, cookie, vocabulary, { count: 1, mode: 'fill-blank', level: 'Starters' })
    await finishSession(app, cookie, vocabulary, { count: 1, mode: 'fill-blank', level: 'Starters' })

    const hub = await app.inject({ method: 'GET', url: '/api/learner/hub', headers: { cookie } })
    expect(hub.json().quests.find((quest: { id: string }) => quest.id === 'play')).toMatchObject({
      progress: 1,
    })
    expect(hub.json().quests.find((quest: { id: string }) => quest.id === 'play-all')).toMatchObject({
      progress: 1,
    })
    await app.close()
  }, 20_000)

  it.each([
    { correctCount: 350, level: 'Flyers', mapStop: 'crystal-caves' },
    { correctCount: 550, level: 'Preliminary', mapStop: 'dragon-ridge' },
  ] as const)('adapts all daily quests to $level after map unlock', async ({ correctCount, level, mapStop }) => {
    const { vocabulary } = await import('./vocabulary.js')
    const directory = await mkdtemp(join(tmpdir(), 'cvq-'))
    directories.push(directory)
    const store = new JsonStore(join(directory, 'database.json'))
    const app = await buildApp({ store })

    const cookie = await signInAsParent(app, store, { name: 'Parent', email: `quest-${level.toLowerCase()}@example.com` })
    const creation = await app.inject({
      method: 'POST',
      url: '/api/learners',
      headers: { cookie },
      payload: { name: 'Explorer', level: 'Starters' },
    })
    const learnerId = creation.json().learner.id
    await app.inject({
      method: 'POST',
      url: '/api/learners/select',
      headers: { cookie },
      payload: { learnerId },
    })

    const word = vocabulary.find((item) => item.level === 'Starters')
    expect(word).toBeTruthy()
    await store.update((database) => {
      for (let index = 0; index < correctCount; index += 1) {
        database.attempts.push({
          id: randomUUID(),
          learnerId,
          wordId: word!.id,
          correct: true,
          answeredAt: '2020-01-01T12:00:00.000Z',
        })
      }
    })

    const hub = await app.inject({ method: 'GET', url: '/api/learner/hub', headers: { cookie } })
    expect(hub.statusCode).toBe(200)
    expect(hub.json().map.unlocks[mapStop]).toBe(true)
    expect(hub.json().quests.find((quest: { id: string }) => quest.id === 'focus')).toMatchObject({
      label: `Finish 1 ${level} quiz or mini-game`,
    })
    expect(hub.json().quests.find((quest: { id: string }) => quest.id === 'play')).toMatchObject({
      label: 'Play 1 mini-game',
    })
    expect(hub.json().quests.find((quest: { id: string }) => quest.id === 'play-all')).toMatchObject({
      label: 'Play all 3 mini-games',
    })
    expect(hub.json().quests.find((quest: { id: string }) => quest.id === 'streak')).toMatchObject({
      label: `Maintain a 5-answer ${level} streak`,
    })
    await app.close()
  }, 20_000)

  it('unlocks map stops starters-first with Nature Valley open at zero correct', async () => {
    const { app, store } = await testApp()
    const cookie = await signInAsParent(app, store, { name: 'Parent', email: 'map@example.com' })
    const creation = await app.inject({
      method: 'POST',
      url: '/api/learners',
      headers: { cookie },
      payload: { name: 'Explorer', level: 'Starters' },
    })
    await app.inject({
      method: 'POST',
      url: '/api/learners/select',
      headers: { cookie },
      payload: { learnerId: creation.json().learner.id },
    })

    const hub = await app.inject({ method: 'GET', url: '/api/learner/hub', headers: { cookie } })
    expect(hub.statusCode).toBe(200)
    const map = hub.json().map
    expect(map.correctCount).toBe(0)
    expect(map.thresholds).toMatchObject({
      'nature-valley': 0,
      'space-station': 200,
      'crystal-caves': 350,
      'dragon-ridge': 550,
    })
    expect(map.unlocks).toMatchObject({
      'nature-valley': true,
      'space-station': false,
      'crystal-caves': false,
      'dragon-ridge': false,
    })
    expect(hub.json().learner.level).toBe('Starters')

    const startersQuiz = await app.inject({
      method: 'POST',
      url: '/api/quiz/sessions',
      headers: { cookie },
      payload: { count: 1, mapStop: 'nature-valley' },
    })
    expect(startersQuiz.statusCode).toBe(201)
    expect(startersQuiz.json().questions.every((question: { level: string }) => question.level === 'Starters')).toBe(true)

    const moversBlocked = await app.inject({
      method: 'POST',
      url: '/api/quiz/sessions',
      headers: { cookie },
      payload: { count: 1, mapStop: 'space-station' },
    })
    expect(moversBlocked.statusCode).toBe(403)
    await app.close()
  }, 20_000)

  it('unlocks map stops at or below a Flyers learner level', async () => {
    const { app, store } = await testApp()
    const cookie = await signInAsParent(app, store, { name: 'Parent', email: 'flyers-map@example.com' })
    const creation = await app.inject({
      method: 'POST',
      url: '/api/learners',
      headers: { cookie },
      payload: { name: 'Flyer', level: 'Flyers' },
    })
    await app.inject({
      method: 'POST',
      url: '/api/learners/select',
      headers: { cookie },
      payload: { learnerId: creation.json().learner.id },
    })

    const hub = await app.inject({ method: 'GET', url: '/api/learner/hub', headers: { cookie } })
    expect(hub.statusCode).toBe(200)
    expect(hub.json().map.correctCount).toBe(0)
    expect(hub.json().map.unlocks).toMatchObject({
      'nature-valley': true,
      'space-station': true,
      'crystal-caves': true,
      'dragon-ridge': false,
    })

    const flyersQuiz = await app.inject({
      method: 'POST',
      url: '/api/quiz/sessions',
      headers: { cookie },
      payload: { count: 1, mapStop: 'crystal-caves' },
    })
    expect(flyersQuiz.statusCode).toBe(201)
    expect(flyersQuiz.json().questions.every((question: { level: string }) => question.level === 'Flyers')).toBe(true)

    const preliminaryBlocked = await app.inject({
      method: 'POST',
      url: '/api/quiz/sessions',
      headers: { cookie },
      payload: { count: 1, mapStop: 'dragon-ridge' },
    })
    expect(preliminaryBlocked.statusCode).toBe(403)
    await app.close()
  }, 20_000)

  it('promotes learner level when correct answers unlock a higher map stop', async () => {
    const { app, store } = await testAppWithStore()
    const cookie = await signInAsParent(app, store, { name: 'Parent', email: 'promote@example.com' })
    const creation = await app.inject({
      method: 'POST',
      url: '/api/learners',
      headers: { cookie },
      payload: { name: 'Climber', level: 'Starters' },
    })
    const learnerId = creation.json().learner.id as string
    await app.inject({
      method: 'POST',
      url: '/api/learners/select',
      headers: { cookie },
      payload: { learnerId },
    })

    await store.update((database) => {
      const now = new Date().toISOString()
      for (let index = 0; index < 200; index += 1) {
        database.attempts.push({
          id: randomUUID(),
          learnerId,
          wordId: `seed-word-${index}`,
          correct: true,
          answeredAt: now,
        })
      }
    })

    const hub = await app.inject({ method: 'GET', url: '/api/learner/hub', headers: { cookie } })
    expect(hub.statusCode).toBe(200)
    expect(hub.json().map.correctCount).toBe(200)
    expect(hub.json().learner.level).toBe('Movers')
    expect(hub.json().map.unlocks).toMatchObject({
      'nature-valley': true,
      'space-station': true,
      'crystal-caves': false,
      'dragon-ridge': false,
    })

    const moversQuiz = await app.inject({
      method: 'POST',
      url: '/api/quiz/sessions',
      headers: { cookie },
      payload: { count: 1, mapStop: 'space-station' },
    })
    expect(moversQuiz.statusCode).toBe(201)
    expect(moversQuiz.json().questions.every((question: { level: string }) => question.level === 'Movers')).toBe(true)
    await app.close()
  }, 20_000)

  it('searches vocabulary for a selected learner without exposing answers', async () => {
    const { app, store } = await testApp()
    const cookie = await signInAsParent(app, store, { name: 'Parent', email: 'search@example.com' })
    const creation = await app.inject({
      method: 'POST',
      url: '/api/learners',
      headers: { cookie },
      payload: { name: 'Explorer', level: 'Starters' },
    })
    await app.inject({
      method: 'POST',
      url: '/api/learners/select',
      headers: { cookie },
      payload: { learnerId: creation.json().learner.id },
    })

    const empty = await app.inject({
      method: 'GET',
      url: '/api/vocabulary/search?q=',
      headers: { cookie },
    })
    expect(empty.statusCode).toBe(200)
    expect(empty.json().results).toEqual([])

    const search = await app.inject({
      method: 'GET',
      url: '/api/vocabulary/search?q=armchair&limit=5',
      headers: { cookie },
    })
    expect(search.statusCode).toBe(200)
    const { results } = search.json() as {
      results: Array<Record<string, unknown>>
    }
    expect(results.length).toBeGreaterThan(0)
    expect(results[0]).toMatchObject({
      word: expect.stringMatching(/armchair/i),
      definition: expect.any(String),
      level: expect.any(String),
    })
    expect(results[0]).not.toHaveProperty('answer')
    expect(results[0]).not.toHaveProperty('choices')
    expect(JSON.stringify(results)).not.toContain('"answer"')
    await app.close()
  }, 20_000)

  it('lists vocabulary categories for a Cambridge level when parent-verified', async () => {
    const { app, store } = await testApp()
    const cookie = await signInAsParent(app, store, { name: 'Parent', email: 'categories@example.com' })
    const creation = await app.inject({
      method: 'POST',
      url: '/api/learners',
      headers: { cookie },
      payload: { name: 'Explorer', level: 'Starters' },
    })
    await app.inject({
      method: 'POST',
      url: '/api/learners/select',
      headers: { cookie },
      payload: { learnerId: creation.json().learner.id },
    })
    await app.inject({
      method: 'POST',
      url: '/api/auth/parent-gate',
      headers: { cookie },
      payload: { password: 'A-secure-password1' },
    })

    const starters = await app.inject({
      method: 'GET',
      url: '/api/vocabulary/categories?level=Starters',
      headers: { cookie },
    })
    expect(starters.statusCode).toBe(200)
    const starterCategories = starters.json().categories as string[]
    expect(starterCategories).toContain('nature')
    expect(starterCategories).toContain('animals')
    expect(starterCategories).not.toContain('health')
    expect(starterCategories).not.toContain('space')

    const movers = await app.inject({
      method: 'GET',
      url: '/api/vocabulary/categories?level=Movers',
      headers: { cookie },
    })
    expect(movers.statusCode).toBe(200)
    expect(movers.json().categories).toContain('health')

    await app.close()
  }, 20_000)

  it('lets a parent-verified adult search, read, and update vocabulary sentences', async () => {
    const { app, store } = await testApp()
    const cookie = await signInAsParent(app, store, { name: 'Parent', email: 'sentences@example.com' })
    const creation = await app.inject({
      method: 'POST',
      url: '/api/learners',
      headers: { cookie },
      payload: { name: 'Explorer', level: 'Starters' },
    })
    await app.inject({
      method: 'POST',
      url: '/api/learners/select',
      headers: { cookie },
      payload: { learnerId: creation.json().learner.id },
    })

    const blocked = await app.inject({
      method: 'GET',
      url: '/api/parent/vocabulary/starters-armchair',
      headers: { cookie },
    })
    expect(blocked.statusCode).toBe(403)

    await app.inject({
      method: 'POST',
      url: '/api/auth/parent-gate',
      headers: { cookie },
      payload: { password: DEFAULT_PASSWORD },
    })

    const search = await app.inject({
      method: 'GET',
      url: '/api/parent/vocabulary/search?q=armchair&limit=5',
      headers: { cookie },
    })
    expect(search.statusCode).toBe(200)
    const { results } = search.json() as {
      results: Array<{ id: string; word: string; sentenceCount: number }>
    }
    expect(results.length).toBeGreaterThan(0)
    expect(results[0]).toMatchObject({
      id: 'starters-armchair',
      word: expect.stringMatching(/armchair/i),
      sentenceCount: expect.any(Number),
    })
    expect(results[0]).not.toHaveProperty('sentences')

    const wordId = 'starters-armchair'
    const original = await app.inject({
      method: 'GET',
      url: `/api/parent/vocabulary/${wordId}`,
      headers: { cookie },
    })
    expect(original.statusCode).toBe(200)
    const originalSentences = original.json().word.sentences as string[]
    expect(originalSentences.length).toBeGreaterThan(0)

    const nextSentences = [
      'There is a soft armchair by the window.',
      'Sam sits in the armchair and reads.',
    ]

    try {
      const updated = await app.inject({
        method: 'PUT',
        url: `/api/parent/vocabulary/${wordId}/sentences`,
        headers: { cookie },
        payload: { sentences: nextSentences },
      })
      expect(updated.statusCode).toBe(200)
      expect(updated.json().word.sentences).toEqual(nextSentences)

      const reloaded = await app.inject({
        method: 'GET',
        url: `/api/parent/vocabulary/${wordId}`,
        headers: { cookie },
      })
      expect(reloaded.statusCode).toBe(200)
      expect(reloaded.json().word.sentences).toEqual(nextSentences)
    } finally {
      await app.inject({
        method: 'PUT',
        url: `/api/parent/vocabulary/${wordId}/sentences`,
        headers: { cookie },
        payload: { sentences: originalSentences },
      })
    }

    await app.close()
  }, 20_000)

  it('creates and deletes a curriculum assignment when parent-verified', async () => {
    const { app, store } = await testApp()
    const cookie = await signInAsParent(app, store, { name: 'Parent', email: 'assign-delete@example.com' })
    const first = await app.inject({
      method: 'POST',
      url: '/api/learners',
      headers: { cookie },
      payload: { name: 'Explorer', level: 'Starters' },
    })
    const second = await app.inject({
      method: 'POST',
      url: '/api/learners',
      headers: { cookie },
      payload: { name: 'Buddy', level: 'Movers' },
    })
    const learnerId = first.json().learner.id as string
    const otherLearnerId = second.json().learner.id as string
    await app.inject({
      method: 'POST',
      url: '/api/learners/select',
      headers: { cookie },
      payload: { learnerId },
    })
    await app.inject({
      method: 'POST',
      url: '/api/auth/parent-gate',
      headers: { cookie },
      payload: { password: 'A-secure-password1' },
    })

    const created = await app.inject({
      method: 'POST',
      url: '/api/curriculum/assignments',
      headers: { cookie },
      payload: { learnerId, level: 'Starters', categories: ['animals', 'food'] },
    })
    expect(created.statusCode).toBe(201)
    const assignmentId = created.json().assignment.id as string

    const duplicate = await app.inject({
      method: 'POST',
      url: '/api/curriculum/assignments',
      headers: { cookie },
      payload: { learnerId, level: 'Starters', categories: ['nature'] },
    })
    expect(duplicate.statusCode).toBe(409)

    const other = await app.inject({
      method: 'POST',
      url: '/api/curriculum/assignments',
      headers: { cookie },
      payload: { learnerId: otherLearnerId, level: 'Movers', categories: ['sports'] },
    })
    expect(other.statusCode).toBe(201)

    const removed = await app.inject({
      method: 'DELETE',
      url: `/api/curriculum/assignments/${assignmentId}`,
      headers: { cookie },
    })
    expect(removed.statusCode).toBe(204)

    const recreated = await app.inject({
      method: 'POST',
      url: '/api/curriculum/assignments',
      headers: { cookie },
      payload: { learnerId, level: 'Starters', categories: ['school'] },
    })
    expect(recreated.statusCode).toBe(201)

    const list = await app.inject({
      method: 'GET',
      url: '/api/curriculum/assignments',
      headers: { cookie },
    })
    expect(list.statusCode).toBe(200)
    expect(list.json().assignments).toHaveLength(2)

    const unknown = await app.inject({
      method: 'DELETE',
      url: '/api/curriculum/assignments/00000000-0000-4000-8000-000000000000',
      headers: { cookie },
    })
    expect(unknown.statusCode).toBe(404)

    await app.close()
  }, 20_000)

  it('deletes a learner after parent verification and cascades related data', async () => {
    const { app, store } = await testApp()
    const cookie = await signInAsParent(app, store, { name: 'Parent', email: 'delete@example.com' })
    const creation = await app.inject({
      method: 'POST',
      url: '/api/learners',
      headers: { cookie },
      payload: { name: 'Explorer', level: 'Movers' },
    })
    const learnerId = creation.json().learner.id as string

    await app.inject({
      method: 'POST',
      url: '/api/learners/select',
      headers: { cookie },
      payload: { learnerId },
    })

    const quizResponse = await app.inject({
      method: 'POST',
      url: '/api/quiz/sessions',
      headers: { cookie },
      payload: { count: 1 },
    })
    expect(quizResponse.statusCode).toBe(201)

    expect((await app.inject({
      method: 'DELETE',
      url: `/api/learners/${learnerId}`,
      headers: { cookie },
    })).statusCode).toBe(403)

    expect((await app.inject({
      method: 'POST',
      url: '/api/auth/parent-gate',
      headers: { cookie },
      payload: { password: 'A-secure-password1' },
    })).statusCode).toBe(200)

    const deleted = await app.inject({
      method: 'DELETE',
      url: `/api/learners/${learnerId}`,
      headers: { cookie },
    })
    expect(deleted.statusCode).toBe(204)

    const listed = await app.inject({
      method: 'GET',
      url: '/api/learners',
      headers: { cookie },
    })
    expect(listed.statusCode).toBe(200)
    expect(listed.json().learners).toEqual([])
    expect(listed.json().selectedLearnerId).toBeNull()

    expect((await app.inject({
      method: 'DELETE',
      url: `/api/learners/${learnerId}`,
      headers: { cookie },
    })).statusCode).toBe(404)

    const otherCookie = await signInAsParent(app, store, { name: 'Other', email: 'other-delete@example.com' })
    const otherLearner = await app.inject({
      method: 'POST',
      url: '/api/learners',
      headers: { cookie: otherCookie },
      payload: { name: 'Sibling', level: 'Starters' },
    })
    expect((await app.inject({
      method: 'DELETE',
      url: `/api/learners/${otherLearner.json().learner.id}`,
      headers: { cookie },
    })).statusCode).toBe(404)

    await app.close()
  }, 20_000)

  it('updates a learner after parent verification and validates PIN changes', async () => {
    const { app, store } = await testApp()
    const cookie = await signInAsParent(app, store, { name: 'Parent', email: 'edit-learner@example.com' })
    const creation = await app.inject({
      method: 'POST',
      url: '/api/learners',
      headers: { cookie },
      payload: { name: 'Explorer', avatar: '🦊', level: 'Starters' },
    })
    const learnerId = creation.json().learner.id as string

    await app.inject({
      method: 'POST',
      url: '/api/learners/select',
      headers: { cookie },
      payload: { learnerId },
    })

    expect((await app.inject({
      method: 'PATCH',
      url: `/api/learners/${learnerId}`,
      headers: { cookie },
      payload: { name: 'Renamed' },
    })).statusCode).toBe(403)

    expect((await app.inject({
      method: 'POST',
      url: '/api/auth/parent-gate',
      headers: { cookie },
      payload: { password: 'A-secure-password1' },
    })).statusCode).toBe(200)

    expect((await app.inject({
      method: 'PATCH',
      url: `/api/learners/${learnerId}`,
      headers: { cookie },
      payload: {},
    })).statusCode).toBe(400)

    expect((await app.inject({
      method: 'PATCH',
      url: `/api/learners/${learnerId}`,
      headers: { cookie },
      payload: { pin: '1234', clearPin: true },
    })).statusCode).toBe(400)

    const updated = await app.inject({
      method: 'PATCH',
      url: `/api/learners/${learnerId}`,
      headers: { cookie },
      payload: { name: 'Renamed', avatar: '🐼', level: 'Movers', pin: '2468' },
    })
    expect(updated.statusCode).toBe(200)
    expect(updated.json().learner).toMatchObject({
      name: 'Renamed',
      avatar: '🐼',
      level: 'Movers',
      hasPin: true,
    })

    const cleared = await app.inject({
      method: 'PATCH',
      url: `/api/learners/${learnerId}`,
      headers: { cookie },
      payload: { clearPin: true },
    })
    expect(cleared.statusCode).toBe(200)
    expect(cleared.json().learner.hasPin).toBe(false)

    expect((await app.inject({
      method: 'PATCH',
      url: `/api/learners/${randomUUID()}`,
      headers: { cookie },
      payload: { name: 'Ghost' },
    })).statusCode).toBe(404)

    const otherCookie = await signInAsParent(app, store, { name: 'Other', email: 'other-edit@example.com' })
    expect((await app.inject({
      method: 'POST',
      url: '/api/auth/parent-gate',
      headers: { cookie: otherCookie },
      payload: { password: 'A-secure-password1' },
    })).statusCode).toBe(200)
    expect((await app.inject({
      method: 'PATCH',
      url: `/api/learners/${learnerId}`,
      headers: { cookie: otherCookie },
      payload: { name: 'Hijacked' },
    })).statusCode).toBe(404)

    await app.close()
  }, 20_000)

  it('ranks hub journey weakest-first and supports focus/review quiz sessions', async () => {
    const { vocabulary } = await import('./vocabulary.js')
    const { app, store } = await testAppWithStore()
    const cookie = await signInAsParent(app, store, { name: 'Parent', email: 'journey@example.com' })
    const creation = await app.inject({
      method: 'POST',
      url: '/api/learners',
      headers: { cookie },
      payload: { name: 'Explorer', level: 'Starters' },
    })
    const learnerId = creation.json().learner.id
    await app.inject({
      method: 'POST',
      url: '/api/learners/select',
      headers: { cookie },
      payload: { learnerId },
    })

    const starters = vocabulary.filter((item) => item.level === 'Starters')
    const healthyWord = starters[0]
    const atRiskWord = starters[1]
    const warmingWord = starters[2]
    expect(healthyWord && atRiskWord && warmingWord).toBeTruthy()

    const now = new Date().toISOString()
    await store.update((database) => {
      for (let index = 0; index < 3; index += 1) {
        database.attempts.push({
          id: randomUUID(),
          learnerId,
          wordId: healthyWord!.id,
          correct: true,
          answeredAt: now,
        })
      }
      for (let index = 0; index < 3; index += 1) {
        database.attempts.push({
          id: randomUUID(),
          learnerId,
          wordId: atRiskWord!.id,
          correct: false,
          answeredAt: now,
        })
      }
      database.attempts.push({
        id: randomUUID(),
        learnerId,
        wordId: warmingWord!.id,
        correct: true,
        answeredAt: now,
      })
    })

    const hub = await app.inject({ method: 'GET', url: '/api/learner/hub', headers: { cookie } })
    expect(hub.statusCode).toBe(200)
    const journey = hub.json().journey as Array<{
      wordId: string
      word: string
      health: string
      mastery: number
    }>
    expect(journey.length).toBeGreaterThanOrEqual(3)
    expect(journey[0]).toMatchObject({ wordId: atRiskWord!.id, health: 'At risk' })
    expect(journey.map((item) => item.wordId)).toContain(warmingWord!.id)
    expect(journey.map((item) => item.wordId)).toContain(healthyWord!.id)
    const atRiskIndex = journey.findIndex((item) => item.wordId === atRiskWord!.id)
    const warmingIndex = journey.findIndex((item) => item.wordId === warmingWord!.id)
    const healthyIndex = journey.findIndex((item) => item.wordId === healthyWord!.id)
    expect(atRiskIndex).toBeLessThan(warmingIndex)
    expect(warmingIndex).toBeLessThan(healthyIndex)

    const focused = await app.inject({
      method: 'POST',
      url: '/api/quiz/sessions',
      headers: { cookie },
      payload: { count: 5, level: 'Starters', focusWordIds: [atRiskWord!.id] },
    })
    expect(focused.statusCode).toBe(201)
    expect(focused.json().questions.some((question: { id: string }) => question.id === atRiskWord!.id)).toBe(true)

    const review = await app.inject({
      method: 'POST',
      url: '/api/quiz/sessions',
      headers: { cookie },
      payload: { count: 8, level: 'Starters', reviewOnly: true },
    })
    expect(review.statusCode).toBe(201)
    const reviewIds = review.json().questions.map((question: { id: string }) => question.id) as string[]
    expect(reviewIds).toContain(atRiskWord!.id)
    expect(reviewIds).toContain(warmingWord!.id)

    await app.close()
  }, 20_000)
})
