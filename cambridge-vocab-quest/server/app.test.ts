import { randomUUID } from 'node:crypto'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { buildApp } from './app.js'
import { JsonStore } from './store.js'

const directories: string[] = []

async function testApp() {
  const directory = await mkdtemp(join(tmpdir(), 'cvq-'))
  directories.push(directory)
  return buildApp({ store: new JsonStore(join(directory, 'database.json')) })
}

async function testAppWithStore() {
  const directory = await mkdtemp(join(tmpdir(), 'cvq-'))
  directories.push(directory)
  const store = new JsonStore(join(directory, 'database.json'))
  const app = await buildApp({ store })
  return { app, store }
}

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })))
})

describe('Cambridge Vocab Quest API', () => {
  it('registers an adult and creates a learner without exposing secrets', async () => {
    const app = await testApp()
    const registration = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { name: 'Parent', email: 'parent@example.com', password: 'A-secure-password1' },
    })
    expect(registration.statusCode).toBe(201)
    const cookie = registration.cookies[0]?.name + '=' + registration.cookies[0]?.value

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

  it('requires the learner PIN and accepts a quiz answer once', async () => {
    const app = await testApp()
    const registration = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { name: 'Parent', email: 'quiz@example.com', password: 'A-secure-password1' },
    })
    const cookie = registration.cookies[0]?.name + '=' + registration.cookies[0]?.value
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
    const app = await testApp()
    const registration = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { name: 'Parent', email: 'half-gems@example.com', password: 'A-secure-password1' },
    })
    const cookie = registration.cookies[0]?.name + '=' + registration.cookies[0]?.value
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
    const app = await testApp()
    const registration = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { name: 'Parent', email: 'gate@example.com', password: 'A-secure-password1' },
    })
    const cookie = registration.cookies[0]?.name + '=' + registration.cookies[0]?.value
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

  it('claims a completed daily quest reward once', async () => {
    const { vocabulary } = await import('./vocabulary.js')
    const app = await testApp()
    const registration = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { name: 'Parent', email: 'quest@example.com', password: 'A-secure-password1' },
    })
    const cookie = registration.cookies[0]?.name + '=' + registration.cookies[0]?.value
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
      label: 'Complete 1 Starters word',
      progress: 0,
    })
    expect(hubBefore.json().quests.find((quest: { id: string }) => quest.id === 'review')).toMatchObject({
      label: 'Practice 5 Starters words',
    })

    const quizResponse = await app.inject({
      method: 'POST',
      url: '/api/quiz/sessions',
      headers: { cookie },
      payload: { count: 1, level: 'Starters' },
    })
    const quiz = quizResponse.json()
    const word = quiz.questions[0]
    const answer = vocabulary.find((item) => item.id === word.id)?.answer
    expect(answer).toBeTruthy()

    await app.inject({
      method: 'POST',
      url: `/api/quiz/sessions/${quiz.id}/answers`,
      headers: { cookie },
      payload: { wordId: word.id, answer },
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

    const registration = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { name: 'Parent', email: 'adaptive-quest@example.com', password: 'A-secure-password1' },
    })
    const cookie = registration.cookies[0]?.name + '=' + registration.cookies[0]?.value
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
      label: 'Complete 1 Movers word',
      progress: 0,
    })
    expect(hub.json().quests.find((quest: { id: string }) => quest.id === 'review')).toMatchObject({
      label: 'Practice 5 Movers words',
      progress: 0,
    })
    expect(hub.json().quests.find((quest: { id: string }) => quest.id === 'streak')).toMatchObject({
      label: 'Maintain a 5-answer Movers streak',
      progress: 0,
    })

    const startersQuiz = await app.inject({
      method: 'POST',
      url: '/api/quiz/sessions',
      headers: { cookie },
      payload: { count: 1, level: 'Starters' },
    })
    const startersQuestion = startersQuiz.json().questions[0]
    const startersAnswer = vocabulary.find((item) => item.id === startersQuestion.id)?.answer
    await app.inject({
      method: 'POST',
      url: `/api/quiz/sessions/${startersQuiz.json().id}/answers`,
      headers: { cookie },
      payload: { wordId: startersQuestion.id, answer: startersAnswer },
    })
    const startersFocusClaim = await app.inject({
      method: 'POST',
      url: '/api/learner/quests/claim',
      headers: { cookie },
      payload: { questId: 'focus' },
    })
    expect(startersFocusClaim.statusCode).toBe(400)

    const hubAfterStarters = await app.inject({ method: 'GET', url: '/api/learner/hub', headers: { cookie } })
    expect(hubAfterStarters.json().quests.find((quest: { id: string }) => quest.id === 'review')).toMatchObject({
      progress: 0,
    })
    expect(hubAfterStarters.json().quests.find((quest: { id: string }) => quest.id === 'streak')).toMatchObject({
      progress: 0,
    })

    const moversQuiz = await app.inject({
      method: 'POST',
      url: '/api/quiz/sessions',
      headers: { cookie },
      payload: { count: 1, level: 'Movers' },
    })
    const moversQuestion = moversQuiz.json().questions[0]
    const moversAnswer = vocabulary.find((item) => item.id === moversQuestion.id)?.answer
    expect(moversAnswer).toBeTruthy()
    await app.inject({
      method: 'POST',
      url: `/api/quiz/sessions/${moversQuiz.json().id}/answers`,
      headers: { cookie },
      payload: { wordId: moversQuestion.id, answer: moversAnswer },
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

  it.each([
    { correctCount: 350, level: 'Flyers', mapStop: 'crystal-caves' },
    { correctCount: 550, level: 'Preliminary', mapStop: 'dragon-ridge' },
  ] as const)('adapts all daily quests to $level after map unlock', async ({ correctCount, level, mapStop }) => {
    const { vocabulary } = await import('./vocabulary.js')
    const directory = await mkdtemp(join(tmpdir(), 'cvq-'))
    directories.push(directory)
    const store = new JsonStore(join(directory, 'database.json'))
    const app = await buildApp({ store })

    const registration = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { name: 'Parent', email: `quest-${level.toLowerCase()}@example.com`, password: 'A-secure-password1' },
    })
    const cookie = registration.cookies[0]?.name + '=' + registration.cookies[0]?.value
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
      label: `Complete 1 ${level} word`,
    })
    expect(hub.json().quests.find((quest: { id: string }) => quest.id === 'review')).toMatchObject({
      label: `Practice 5 ${level} words`,
    })
    expect(hub.json().quests.find((quest: { id: string }) => quest.id === 'streak')).toMatchObject({
      label: `Maintain a 5-answer ${level} streak`,
    })
    await app.close()
  }, 20_000)

  it('unlocks map stops starters-first with Nature Valley open at zero correct', async () => {
    const app = await testApp()
    const registration = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { name: 'Parent', email: 'map@example.com', password: 'A-secure-password1' },
    })
    const cookie = registration.cookies[0]?.name + '=' + registration.cookies[0]?.value
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
    const app = await testApp()
    const registration = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { name: 'Parent', email: 'flyers-map@example.com', password: 'A-secure-password1' },
    })
    const cookie = registration.cookies[0]?.name + '=' + registration.cookies[0]?.value
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
    const registration = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { name: 'Parent', email: 'promote@example.com', password: 'A-secure-password1' },
    })
    const cookie = registration.cookies[0]?.name + '=' + registration.cookies[0]?.value
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
    const app = await testApp()
    const registration = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { name: 'Parent', email: 'search@example.com', password: 'A-secure-password1' },
    })
    const cookie = registration.cookies[0]?.name + '=' + registration.cookies[0]?.value
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

  it('deletes a learner after parent verification and cascades related data', async () => {
    const app = await testApp()
    const registration = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { name: 'Parent', email: 'delete@example.com', password: 'A-secure-password1' },
    })
    const cookie = registration.cookies[0]?.name + '=' + registration.cookies[0]?.value
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

    const otherParent = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { name: 'Other', email: 'other-delete@example.com', password: 'A-secure-password1' },
    })
    const otherCookie = otherParent.cookies[0]?.name + '=' + otherParent.cookies[0]?.value
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
    const app = await testApp()
    const registration = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { name: 'Parent', email: 'edit-learner@example.com', password: 'A-secure-password1' },
    })
    const cookie = registration.cookies[0]?.name + '=' + registration.cookies[0]?.value
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

    const otherParent = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { name: 'Other', email: 'other-edit@example.com', password: 'A-secure-password1' },
    })
    const otherCookie = otherParent.cookies[0]?.name + '=' + otherParent.cookies[0]?.value
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
    const registration = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { name: 'Parent', email: 'journey@example.com', password: 'A-secure-password1' },
    })
    const cookie = registration.cookies[0]?.name + '=' + registration.cookies[0]?.value
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
