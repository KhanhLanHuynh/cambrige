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
      for (let index = 0; index < 50; index += 1) {
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
      label: 'Review 5 Starters words',
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
      'space-station': 50,
      'crystal-caves': 150,
      'dragon-ridge': 300,
    })
    expect(map.unlocks).toMatchObject({
      'nature-valley': true,
      'space-station': false,
      'crystal-caves': false,
      'dragon-ridge': false,
    })

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
})
