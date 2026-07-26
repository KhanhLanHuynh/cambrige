import { mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { JsonStore, emptyDatabase, migrateDatabase, type Database, type DataStore } from './store.js'

/** SQLite-backed store: one JSON document with SQLite locking for concurrent writes. */
export class SqliteStore implements DataStore {
  readonly filePath: string
  private db: DatabaseSync | null = null
  private data: Database = emptyDatabase()
  private operation = Promise.resolve()

  constructor(filePath = process.env.DATA_FILE ?? resolve(process.cwd(), 'server', 'data', 'database.sqlite')) {
    this.filePath = filePath
  }

  async init(): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true })
    this.db = new DatabaseSync(this.filePath)
    this.db.exec('PRAGMA journal_mode = WAL')
    this.db.exec('CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL)')
    const row = this.db.prepare('SELECT value FROM kv WHERE key = ?').get('database') as { value: string } | undefined
    if (row?.value) {
      this.data = migrateDatabase(JSON.parse(row.value) as Database)
    } else {
      this.persist()
    }
  }

  read<T>(reader: (database: Readonly<Database>) => T): T {
    return reader(this.data)
  }

  async update<T>(mutator: (database: Database) => T | Promise<T>): Promise<T> {
    let result!: T
    const run = async () => {
      const draft = structuredClone(this.data)
      result = await mutator(draft)
      this.persist(draft)
      this.data = draft
    }
    this.operation = this.operation.then(run, run)
    await this.operation
    return result
  }

  async reset(next: Database = emptyDatabase()): Promise<void> {
    await this.update((database) => Object.assign(database, structuredClone(migrateDatabase(next))))
  }

  private persist(database: Database = this.data): void {
    if (!this.db) throw new Error('SqliteStore is not initialised')
    this.db.prepare('INSERT INTO kv(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
      .run('database', JSON.stringify(database))
  }
}

export function createStore(filePath?: string): DataStore {
  const path = filePath ?? process.env.DATA_FILE ?? resolve(process.cwd(), 'server', 'data', 'database.json')
  const backend = (process.env.DATA_BACKEND ?? (path.endsWith('.sqlite') || path.endsWith('.db') ? 'sqlite' : 'json')).toLowerCase()
  if (backend === 'sqlite') {
    const sqlitePath = path.endsWith('.json') ? path.replace(/\.json$/i, '.sqlite') : path
    return new SqliteStore(sqlitePath)
  }
  return new JsonStore(path)
}
