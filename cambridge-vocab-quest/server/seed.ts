import { randomUUID } from 'node:crypto'
import { pathToFileURL } from 'node:url'
import { createStore } from './sqlite-store.js'
import { emptyDatabase, type DataStore } from './store.js'
import { hashSecret } from './security.js'

const DEMO_EMAIL = 'demo@example.com'
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'khanhlanhuynh@gmail.com'

export async function seedStore(store: DataStore, reset = false): Promise<void> {
  if (reset) await store.reset(emptyDatabase())
  const now = new Date().toISOString()

  const demoExists = store.read((database) => database.users.some((user) => user.email === DEMO_EMAIL))
  if (demoExists) {
    await store.update((database) => {
      const user = database.users.find((item) => item.email === DEMO_EMAIL)
      if (user && (!user.giftCatalog || user.giftCatalog.length === 0)) {
        user.giftCatalog = [
          { id: randomUUID(), name: 'Sticker pack', costGems: 100 },
          { id: randomUUID(), name: 'Ice cream treat', costGems: 250 },
          { id: randomUUID(), name: 'Cinema outing', costGems: 500 },
        ]
      }
    })
  } else {
    const userId = randomUUID()
    const learnerId = randomUUID()
    const passwordHash = await hashSecret(process.env.SEED_PASSWORD ?? 'DemoPassword123!')
    const pinHash = await hashSecret(process.env.SEED_PIN ?? '1234')

    await store.update((database) => {
      database.users.push({
        id: userId,
        name: 'Demo Parent',
        email: DEMO_EMAIL,
        passwordHash,
        role: 'parent',
        createdAt: now,
        giftCatalog: [
          { id: randomUUID(), name: 'Sticker pack', costGems: 100 },
          { id: randomUUID(), name: 'Ice cream treat', costGems: 250 },
          { id: randomUUID(), name: 'Cinema outing', costGems: 500 },
        ],
      })
      database.learners.push({
        id: learnerId,
        userId,
        nickname: 'Word Explorer',
        avatar: 'owl',
        level: 'Movers',
        pinHash,
        streak: 3,
        gems: 420,
        claimedQuestIds: [],
        achievementIds: [],
        perfectQuizCount: 0,
        minutesPractisedToday: 0,
        completedQuizToday: false,
        miniGameModesCompletedToday: [],
        settings: {
          dailyGoal: 10,
          dailyLimitMinutes: 45,
          reviewMix: 25,
          timedModesEnabled: true,
          focusMode: false,
          soundEnabled: true,
          hintsEnabled: true,
          speedMatchSeconds: 60,
        },
        createdAt: now,
      })
    })
  }

  const adminExists = store.read((database) => database.users.some((user) => user.email === ADMIN_EMAIL))
  if (!adminExists) {
    const passwordHash = await hashSecret(process.env.SEED_ADMIN_PASSWORD ?? 'Hc5n/Kz]A~m83<af')
    await store.update((database) => {
      database.users.push({
        id: randomUUID(),
        name: 'Super Admin',
        email: ADMIN_EMAIL,
        passwordHash,
        role: 'superadmin',
        createdAt: now,
        giftCatalog: [],
      })
    })
  }
}

async function main() {
  const store = createStore()
  await store.init()
  await seedStore(store, process.argv.includes('--reset'))
  console.log(`Seed complete: ${store.filePath}`)
  console.log(`Demo adult: ${DEMO_EMAIL} / ${process.env.SEED_PASSWORD ?? 'DemoPassword123!'}`)
  console.log(`Super-admin: ${ADMIN_EMAIL} / ${process.env.SEED_ADMIN_PASSWORD ?? 'AdminPassword123!'}`)
  console.log(`Learner PIN: ${process.env.SEED_PIN ?? '1234'}`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}
