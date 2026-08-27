import { buildApp } from './app.js'
import { seedStore } from './seed.js'
import { createStore } from './sqlite-store.js'

async function start() {
  const startedAt = Date.now()
  // Render (and other hosts) inject PORT and require 0.0.0.0. Binding to 127.0.0.1
  // makes the process look "up" locally while the platform health check times out.
  const port = Number(process.env.PORT ?? 3001)
  const host = process.env.HOST ?? '0.0.0.0'

  const store = createStore()
  await store.init()

  const app = await buildApp({ store, logger: true })
  await app.listen({ port, host })
  app.log.info({ host, port, ms: Date.now() - startedAt }, 'API listening')

  if (process.env.SEED_ON_START === 'true') {
    await seedStore(store, process.env.RESET_DATA === 'true')
    app.log.info('Seed complete')
  }
}

start().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
