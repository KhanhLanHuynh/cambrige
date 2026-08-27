import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'

function resolvePort(): number {
  const parsed = Number(process.env.PORT)
  if (Number.isInteger(parsed) && parsed > 0) return parsed
  // Render's internal health check targets :10000 unless PORT is set.
  return process.env.NODE_ENV === 'production' ? 10000 : 3001
}

function resolveHost(): string {
  const host = process.env.HOST
  if (host && host !== '127.0.0.1' && host !== 'localhost') return host
  return '0.0.0.0'
}

async function start() {
  const startedAt = Date.now()
  const port = resolvePort()
  const host = resolveHost()

  let requestHandler = (_req: IncomingMessage, res: ServerResponse) => {
    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' })
    res.end('{"ok":true}')
  }

  const httpServer = createServer((req, res) => {
    requestHandler(req, res)
  })

  await new Promise<void>((resolve, reject) => {
    httpServer.once('error', reject)
    httpServer.listen(port, host, () => {
      console.log(`API bound ${host}:${port} after ${Date.now() - startedAt}ms`)
      resolve()
    })
  })

  const { createStore } = await import('./sqlite-store.js')
  const { buildApp } = await import('./app.js')
  const { seedStore } = await import('./seed.js')

  const store = createStore()
  await store.init()

  let fastifyHandler: ((req: IncomingMessage, res: ServerResponse) => void) | undefined
  const app = await buildApp({
    store,
    logger: true,
    serverFactory: (handler) => {
      fastifyHandler = handler
      return httpServer
    },
  })
  await app.ready()
  if (!fastifyHandler) throw new Error('Fastify did not provide a request handler')
  requestHandler = fastifyHandler

  app.log.info({ host, port, ms: Date.now() - startedAt }, 'API ready')

  if (process.env.SEED_ON_START === 'true') {
    await seedStore(store, process.env.RESET_DATA === 'true')
    app.log.info('Seed complete')
  }
}

start().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
