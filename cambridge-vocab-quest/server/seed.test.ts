import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createParent } from './admin-parent.js'
import { seedStore } from './seed.js'
import { verifySecret } from './security.js'
import { JsonStore } from './store.js'

const DEFAULT_ADMIN_EMAIL = 'khanhlanhuynh@gmail.com'
const DEFAULT_ADMIN_PASSWORD = 'Hc5n/Kz]A~m83<af'

describe('seed super admin', () => {
  const directories: string[] = []
  const originalAdminPassword = process.env.SEED_ADMIN_PASSWORD
  const originalAdminEmail = process.env.SEED_ADMIN_EMAIL

  afterEach(async () => {
    if (originalAdminPassword === undefined) delete process.env.SEED_ADMIN_PASSWORD
    else process.env.SEED_ADMIN_PASSWORD = originalAdminPassword
    if (originalAdminEmail === undefined) delete process.env.SEED_ADMIN_EMAIL
    else process.env.SEED_ADMIN_EMAIL = originalAdminEmail
    await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })))
  })

  async function store() {
    const directory = await mkdtemp(join(tmpdir(), 'cvq-seed-'))
    directories.push(directory)
    const next = new JsonStore(join(directory, 'database.json'))
    await next.init()
    return next
  }

  it('creates the super admin with the seeded password', async () => {
    delete process.env.SEED_ADMIN_PASSWORD
    delete process.env.SEED_ADMIN_EMAIL
    const data = await store()
    await seedStore(data)
    const admin = data.read((database) => database.users.find((user) => user.email === DEFAULT_ADMIN_EMAIL))
    expect(admin?.role).toBe('superadmin')
    expect(await verifySecret(DEFAULT_ADMIN_PASSWORD, admin!.passwordHash)).toBe(true)
    expect(await verifySecret('AdminPassword123!', admin!.passwordHash)).toBe(false)
  })

  it('replaces an existing account so the seeded super-admin password works', async () => {
    delete process.env.SEED_ADMIN_PASSWORD
    delete process.env.SEED_ADMIN_EMAIL
    const data = await store()
    await createParent(data, {
      name: 'Lan',
      email: DEFAULT_ADMIN_EMAIL,
      password: 'ParentPassword1!',
    })
    await seedStore(data)
    const admin = data.read((database) => database.users.find((user) => user.email === DEFAULT_ADMIN_EMAIL))
    expect(admin?.role).toBe('superadmin')
    expect(await verifySecret(DEFAULT_ADMIN_PASSWORD, admin!.passwordHash)).toBe(true)
    expect(await verifySecret('ParentPassword1!', admin!.passwordHash)).toBe(false)
  })

  it('keeps the hash when the seeded password already matches', async () => {
    delete process.env.SEED_ADMIN_PASSWORD
    delete process.env.SEED_ADMIN_EMAIL
    const data = await store()
    await seedStore(data)
    const first = data.read((database) => database.users.find((user) => user.role === 'superadmin')!.passwordHash)
    await seedStore(data)
    const second = data.read((database) => database.users.find((user) => user.role === 'superadmin')!.passwordHash)
    expect(second).toBe(first)
  })
})
