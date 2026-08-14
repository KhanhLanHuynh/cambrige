import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCallback)
const KEY_LENGTH = 64

export async function hashSecret(secret: string): Promise<string> {
  const salt = randomBytes(16)
  const key = await scrypt(secret, salt, KEY_LENGTH) as Buffer
  return `scrypt$${salt.toString('base64url')}$${key.toString('base64url')}`
}

export async function verifySecret(secret: string, encoded: string): Promise<boolean> {
  const [algorithm, saltText, expectedText] = encoded.split('$')
  if (algorithm !== 'scrypt' || !saltText || !expectedText) return false
  try {
    const expected = Buffer.from(expectedText, 'base64url')
    const actual = await scrypt(secret, Buffer.from(saltText, 'base64url'), expected.length) as Buffer
    return actual.length === expected.length && timingSafeEqual(actual, expected)
  } catch {
    return false
  }
}

export function createSessionToken(): string {
  return randomBytes(32).toString('base64url')
}

export function digestToken(token: string): string {
  return createHash('sha256').update(token).digest('base64url')
}

const DEV_WEB_PORTS = new Set(['5173', '4173'])

export function isPrivateLanHostname(hostname: string): boolean {
  if (hostname === 'localhost' || hostname === '127.0.0.1') return true
  const parts = hostname.split('.')
  if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/.test(part))) return false
  const octets = parts.map(Number)
  if (octets.some((octet) => octet > 255)) return false
  const first = octets[0]
  const second = octets[1]
  if (first === 10) return true
  if (first === 192 && second === 168) return true
  if (first === 172 && second !== undefined && second >= 16 && second <= 31) return true
  return false
}

export function isDevLanWebOrigin(origin: string): boolean {
  try {
    const url = new URL(origin)
    if (url.protocol !== 'http:') return false
    if (url.username || url.password) return false
    const port = url.port || '80'
    if (!DEV_WEB_PORTS.has(port)) return false
    return isPrivateLanHostname(url.hostname)
  } catch {
    return false
  }
}

export function isAllowedCorsOrigin(
  origin: string | undefined,
  configuredOrigins: string[],
  allowDevLan: boolean,
): boolean {
  if (!origin) return true
  if (configuredOrigins.includes(origin)) return true
  return allowDevLan && isDevLanWebOrigin(origin)
}
