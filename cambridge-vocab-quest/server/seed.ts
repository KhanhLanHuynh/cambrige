import { randomUUID } from 'node:crypto'
import { pathToFileURL } from 'node:url'
import { createStore } from './sqlite-store.js'
import { emptyDatabase, type DataStore, type GiftDefinition } from './store.js'
import { hashSecret, verifySecret } from './security.js'

const DEMO_EMAIL = 'demo@example.com'
const DEFAULT_ADMIN_EMAIL = 'khanhlanhuynh@gmail.com'
const DEFAULT_ADMIN_PASSWORD = 'Hc5n/Kz]A~m83<af'

function adminEmail(): string {
  return (process.env.SEED_ADMIN_EMAIL ?? DEFAULT_ADMIN_EMAIL).trim().toLowerCase()
}

function adminPassword(): string {
  return process.env.SEED_ADMIN_PASSWORD ?? DEFAULT_ADMIN_PASSWORD
}

const demoGiftCatalog = (): GiftDefinition[] => [
  { id: randomUUID(), name: 'Sticker pack', costGems: 100 },
  { id: randomUUID(), name: 'Ice cream treat', costGems: 250 },
  { id: randomUUID(), name: 'Cinema outing', costGems: 500 },
]

export async function seedStore(store: DataStore, reset = false): Promise<void> {
  if (reset) await store.reset(emptyDatabase())
  const now = new Date().toISOString()

  const demoExists = store.read((database) => database.users.some((user) => user.email === DEMO_EMAIL))
  if (demoExists) {
    await store.update((database) => {
      const user = database.users.find((item) => item.email === DEMO_EMAIL)
      if (!user) return
      const learners = database.learners.filter((item) => item.userId === user.id)
      for (const learner of learners) {
        if (!learner.giftCatalog || learner.giftCatalog.length === 0) {
          learner.giftCatalog = demoGiftCatalog()
        }
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
        giftCatalog: demoGiftCatalog(),
        createdAt: now,
      })
    })
  }

  await ensureSuperAdmin(store, now)
}

async function ensureSuperAdmin(store: DataStore, now: string): Promise<void> {
  const email = adminEmail()
  const password = adminPassword()
  const existing = store.read((database) =>
    database.users.find((user) => user.email.trim().toLowerCase() === email),
  )

  if (!existing) {
    const passwordHash = await hashSecret(password)
    await store.update((database) => {
      database.users.push({
        id: randomUUID(),
        name: 'Super Admin',
        email,
        passwordHash,
        role: 'superadmin',
        createdAt: now,
      })
    })
    return
  }

  const passwordMatches = await verifySecret(password, existing.passwordHash)
  if (passwordMatches && existing.role === 'superadmin' && existing.email === email) return

  const passwordHash = passwordMatches ? existing.passwordHash : await hashSecret(password)
  await store.update((database) => {
    const target = database.users.find((user) => user.id === existing.id)
    if (!target) return
    target.email = email
    target.role = 'superadmin'
    target.passwordHash = passwordHash
    if (!passwordMatches) {
      database.sessions = database.sessions.filter((session) => session.userId !== target.id)
    }
  })
}

async function main() {
  const store = createStore()
  await store.init()
  await seedStore(store, process.argv.includes('--reset'))
  console.log(`Seed complete: ${store.filePath}`)
  console.log(`Demo adult: ${DEMO_EMAIL} / ${process.env.SEED_PASSWORD ?? 'DemoPassword123!'}`)
  console.log(`Super-admin: ${adminEmail()} / ${adminPassword()}`)
  console.log(`Learner PIN: ${process.env.SEED_PIN ?? '1234'}`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}
