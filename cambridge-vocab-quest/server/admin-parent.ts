import { randomUUID } from 'node:crypto'
import { pathToFileURL } from 'node:url'
import { parentUpdateSchema, registerSchema } from '../shared/schemas.js'
import { hashSecret } from './security.js'
import { createStore } from './sqlite-store.js'
import { isSuperAdmin, type DataStore, type UserRole } from './store.js'

export class AdminError extends Error {
  constructor(message: string, readonly statusCode = 400) {
    super(message)
    this.name = 'AdminError'
  }
}

export interface SafeParent {
  id: string
  name: string
  email: string
  role: UserRole
}

export interface AdminParentSummary {
  id: string
  name: string
  email: string
  createdAt: string
  learnerCount: number
}

function asParent(user: { id: string; name: string; email: string; role?: UserRole }): SafeParent {
  return { id: user.id, name: user.name, email: user.email, role: user.role ?? 'parent' }
}

export async function createParent(
  store: DataStore,
  input: { name: string; email: string; password: string },
): Promise<SafeParent> {
  const body = registerSchema.parse(input)
  const duplicate = store.read((database) => database.users.some((user) => user.email === body.email))
  if (duplicate) throw new AdminError('An account with that email already exists', 409)

  const user = {
    id: randomUUID(),
    name: body.name,
    email: body.email,
    passwordHash: await hashSecret(body.password),
    role: 'parent' as const,
    createdAt: new Date().toISOString(),
  }
  await store.update((database) => database.users.push(user))
  return asParent(user)
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

export async function promoteParent(
  store: DataStore,
  input: { email: string },
): Promise<SafeParent> {
  const email = input.email.trim().toLowerCase()
  if (!email) throw new AdminError('Email is required')

  const user = store.read((database) => database.users.find((item) => item.email === email))
  if (!user) throw new AdminError('No parent account found for that email')

  await store.update((database) => {
    const target = database.users.find((item) => item.email === email)
    if (!target) throw new AdminError('No parent account found for that email')
    target.role = 'superadmin'
  })
  return { id: user.id, name: user.name, email: user.email, role: 'superadmin' }
}

export function listParents(store: DataStore): AdminParentSummary[] {
  return store.read((database) =>
    database.users
      .filter((user) => !isSuperAdmin(user))
      .map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        learnerCount: database.learners.filter((learner) => learner.userId === user.id).length,
      }))
      .sort((left, right) => left.email.localeCompare(right.email)),
  )
}

export async function updateParent(
  store: DataStore,
  id: string,
  input: { name?: string; email?: string },
): Promise<AdminParentSummary> {
  const body = parentUpdateSchema.parse(input)
  const updated = await store.update((database) => {
    const target = database.users.find((item) => item.id === id)
    if (!target || isSuperAdmin(target)) throw new AdminError('Parent not found', 404)
    if (body.email && body.email !== target.email) {
      const taken = database.users.some((item) => item.id !== id && item.email === body.email)
      if (taken) throw new AdminError('An account with that email already exists', 409)
      database.passwordResets = database.passwordResets.filter((item) => item.email !== target.email)
      target.email = body.email
    }
    if (body.name !== undefined) target.name = body.name
    return {
      id: target.id,
      name: target.name,
      email: target.email,
      createdAt: target.createdAt,
      learnerCount: database.learners.filter((learner) => learner.userId === target.id).length,
    }
  })
  return updated
}

export async function deleteParent(
  store: DataStore,
  id: string,
  actorUserId: string,
): Promise<void> {
  if (id === actorUserId) throw new AdminError('You cannot delete your own account', 403)

  await store.update((database) => {
    const target = database.users.find((item) => item.id === id)
    if (!target) throw new AdminError('Parent not found', 404)
    if (isSuperAdmin(target)) throw new AdminError('Super-admin accounts cannot be deleted', 403)

    const learnerIds = new Set(
      database.learners.filter((learner) => learner.userId === id).map((learner) => learner.id),
    )
    database.users = database.users.filter((user) => user.id !== id)
    database.learners = database.learners.filter((learner) => learner.userId !== id)
    database.sessions = database.sessions.filter((session) => session.userId !== id)
    database.quizzes = database.quizzes.filter((quiz) => quiz.userId !== id)
    database.assignments = database.assignments.filter((assignment) => assignment.userId !== id)
    database.redemptions = database.redemptions.filter((redemption) => redemption.userId !== id)
    database.attempts = database.attempts.filter((attempt) => !learnerIds.has(attempt.learnerId))
    database.passwordResets = database.passwordResets.filter((item) => item.email !== target.email)
  })
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
  tsx server/admin-parent.ts reset-password --email parent@example.com --password "NewSecurePass1!"
  tsx server/admin-parent.ts promote --email khanhlanhuynh@gmail.com`)
  process.exit(1)
}

async function main() {
  const [command, ...rest] = process.argv.slice(2)
  if (command !== 'create' && command !== 'reset-password' && command !== 'promote') usage()

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

  if (command === 'promote') {
    if (!flags.email) throw new AdminError('promote requires --email')
    const user = await promoteParent(store, { email: flags.email })
    console.log(`Promoted ${user.email} (${user.id}) to super-admin`)
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
