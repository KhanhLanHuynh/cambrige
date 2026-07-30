import { randomUUID } from 'node:crypto'
import { pathToFileURL } from 'node:url'
import { registerSchema } from '../shared/schemas.js'
import { hashSecret } from './security.js'
import { createStore } from './sqlite-store.js'
import type { DataStore, GiftDefinition } from './store.js'

export class AdminError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AdminError'
  }
}

export async function createParent(
  store: DataStore,
  input: { name: string; email: string; password: string },
): Promise<{ id: string; name: string; email: string }> {
  const body = registerSchema.parse(input)
  const duplicate = store.read((database) => database.users.some((user) => user.email === body.email))
  if (duplicate) throw new AdminError('An account with that email already exists')

  const user = {
    id: randomUUID(),
    name: body.name,
    email: body.email,
    passwordHash: await hashSecret(body.password),
    createdAt: new Date().toISOString(),
    giftCatalog: [] as GiftDefinition[],
  }
  await store.update((database) => database.users.push(user))
  return { id: user.id, name: user.name, email: user.email }
}

export async function resetParentPassword(
  store: DataStore,
  input: { email: string; password: string },
): Promise<{ id: string; email: string }> {
  const email = input.email.trim().toLowerCase()
  const password = input.password
  if (!email) throw new AdminError('Email is required')
  if (password.length < 10 || password.length > 128) {
    throw new AdminError('Password must be between 10 and 128 characters')
  }

  const user = store.read((database) => database.users.find((item) => item.email === email))
  if (!user) throw new AdminError('No parent account found for that email')

  const passwordHash = await hashSecret(password)
  await store.update((database) => {
    const target = database.users.find((item) => item.email === email)
    if (!target) throw new AdminError('No parent account found for that email')
    target.passwordHash = passwordHash
    database.sessions = database.sessions.filter((session) => session.userId !== target.id)
    database.passwordResets = database.passwordResets.filter((item) => item.email !== email)
  })
  return { id: user.id, email: user.email }
}

function parseFlags(argv: string[]): Record<string, string> {
  const flags: Record<string, string> = {}
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index]
    if (!arg?.startsWith('--')) continue
    const key = arg.slice(2)
    const value = argv[index + 1]
    if (!value || value.startsWith('--')) {
      throw new AdminError(`Missing value for --${key}`)
    }
    flags[key] = value
    index++
  }
  return flags
}

function usage(): never {
  console.error(`Usage:
  tsx server/admin-parent.ts create --name "Jamie" --email parent@example.com --password "A-secure-password1"
  tsx server/admin-parent.ts reset-password --email parent@example.com --password "NewSecurePass1!"`)
  process.exit(1)
}

async function main() {
  const [command, ...rest] = process.argv.slice(2)
  if (command !== 'create' && command !== 'reset-password') usage()

  const flags = parseFlags(rest)
  const store = createStore()
  await store.init()

  if (command === 'create') {
    if (!flags.name || !flags.email || !flags.password) {
      throw new AdminError('create requires --name, --email, and --password')
    }
    const user = await createParent(store, {
      name: flags.name,
      email: flags.email,
      password: flags.password,
    })
    console.log(`Created parent ${user.email} (${user.id})`)
    console.log(`Store: ${store.filePath}`)
    return
  }

  if (!flags.email || !flags.password) {
    throw new AdminError('reset-password requires --email and --password')
  }
  const user = await resetParentPassword(store, {
    email: flags.email,
    password: flags.password,
  })
  console.log(`Reset password for ${user.email} (${user.id})`)
  console.log(`Store: ${store.filePath}`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof AdminError || error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
}
