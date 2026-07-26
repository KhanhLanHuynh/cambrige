import { buildApp } from './app.js'
import { seedStore } from './seed.js'
import { createStore } from './sqlite-store.js'

async function start() {
  const store = createStore()
  await store.init()
  if (process.env.SEED_ON_START === 'true') {
    await seedStore(store, process.env.RESET_DATA === 'true')
  }

  const app = await buildApp({ store, logger: true })
  const port = Number(process.env.PORT ?? 3001)
  const host = process.env.HOST ?? '127.0.0.1'
  await app.listen({ port, host })
}

start().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
