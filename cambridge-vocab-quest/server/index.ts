import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import type { FastifyInstance } from 'fastify'
import { resolveListenHost, resolvePort } from './listen-config.js'
import { installShutdownHandlers } from './shutdown.js'

async function start() {
  const startedAt = Date.now()
  const port = resolvePort()
  const host = resolveListenHost()

  let requestHandler = (_req: IncomingMessage, res: ServerResponse) => {
    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' })
    res.end('{"ok":true}')
  }

  const httpServer = createServer((req, res) => {
    requestHandler(req, res)
  })

  let app: FastifyInstance | undefined
  installShutdownHandlers(async () => {
    if (app) {
      await app.close()
      return
    }
    await new Promise<void>((resolve, reject) => {
      httpServer.close((error) => error ? reject(error) : resolve())
    })
  })

  await new Promise<void>((resolve, reject) => {
    httpServer.once('error', (error) => {
      console.error(`Failed to bind ${host}:${port} (HOST=${JSON.stringify(process.env.HOST)})`)
      reject(error)
    })
    httpServer.listen({ port, host, ipv6Only: false }, () => {
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
  app = await buildApp({
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
  process.exit(1)
})
