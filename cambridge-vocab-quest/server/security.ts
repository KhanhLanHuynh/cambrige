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
