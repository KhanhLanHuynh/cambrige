type Env = NodeJS.Dict<string | undefined>

export function resolvePort(env: Env = process.env): number {
  const parsed = Number(env.PORT)
  if (Number.isInteger(parsed) && parsed > 0) return parsed
  // Render's internal health check targets :10000 unless PORT is set.
  return env.NODE_ENV === 'production' ? 10000 : 3001
}

export function resolveListenHost(env: Env = process.env): string {
  const host = env.HOST?.replace(/^\uFEFF/, '').replace(/\s+/g, '')
  if (host === '127.0.0.1' || host === 'localhost') return '0.0.0.0'
  if (host && host !== '0.0.0.0' && host !== '*' && host !== '::') return host
  // Railway's network healthcheck reaches the container over IPv6.
  // `0.0.0.0` is IPv4-only and fails after the ~5 minute timeout.
  return env.NODE_ENV === 'production' ? '::' : '0.0.0.0'
}
