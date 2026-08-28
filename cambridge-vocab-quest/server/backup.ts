import type { CambridgeLevel } from '../shared/types.js'
import { restoreVocabularyFiles, snapshotVocabularyFiles, VOCABULARY_LEVELS, type VocabularyFile } from './vocabulary.js'
import { migrateDatabase, type Database, type DataStore, type SessionRecord, type UserRecord } from './store.js'

export class BackupError extends Error {
  constructor(message: string, readonly statusCode: number) {
    super(message)
  }
}

export type BackupScope = 'database' | 'vocabulary'

export interface BackupScopes {
  database: boolean
  vocabulary: boolean
}

export interface BackupDocument {
  format: 'cvq-backup'
  version: 1
  exportedAt: string
  includes: BackupScope[]
  database?: Database
  vocabulary?: Record<CambridgeLevel, VocabularyFile>
}

export function backupFilename(scopes: BackupScopes, date = new Date()): string {
  const day = date.toISOString().slice(0, 10)
  if (scopes.database && scopes.vocabulary) return `cvq-backup-${day}.json`
  if (scopes.database) return `cvq-backup-database-${day}.json`
  return `cvq-backup-vocabulary-${day}.json`
}

function cloneDatabaseWithoutEphemeral(database: Database): Database {
  const next = migrateDatabase(database)
  next.sessions = []
  next.passwordResets = []
  return next
}

export function buildBackup(store: DataStore, scopes: BackupScopes): BackupDocument {
  if (!scopes.database && !scopes.vocabulary) {
    throw new BackupError('Select runtime data, vocabulary, or both', 400)
  }
  const includes: BackupScope[] = []
  const document: BackupDocument = {
    format: 'cvq-backup',
    version: 1,
    exportedAt: new Date().toISOString(),
    includes,
  }
  if (scopes.database) {
    includes.push('database')
    document.database = store.read((database) => cloneDatabaseWithoutEphemeral(database))
  }
  if (scopes.vocabulary) {
    includes.push('vocabulary')
    document.vocabulary = snapshotVocabularyFiles()
  }
  return document
}

export interface ApplyBackupContext {
  currentUser: UserRecord
  currentSession: SessionRecord
}

export interface ApplyBackupResult {
  restored: BackupScope[]
  users?: number
  learners?: number
  words?: number
}

function parseBackup(payload: unknown): BackupDocument {
  if (!payload || typeof payload !== 'object') {
    throw new BackupError('Invalid backup file', 400)
  }
  const raw = payload as Record<string, unknown>
  if (raw.format !== 'cvq-backup') {
    throw new BackupError('Unknown backup format', 400)
  }
  if (raw.version !== 1) {
    throw new BackupError('Unsupported backup version', 400)
  }
  return raw as unknown as BackupDocument
}

function preserveAdminSession(next: Database, context: ApplyBackupContext): void {
  const matching = next.users.find((user) => user.email === context.currentUser.email)
  if (matching) {
    matching.role = 'superadmin'
    next.sessions.push({
      tokenHash: context.currentSession.tokenHash,
      userId: matching.id,
      expiresAt: context.currentSession.expiresAt,
      parentVerifiedUntil: context.currentSession.parentVerifiedUntil,
    })
    return
  }
  next.users.push(structuredClone(context.currentUser))
  next.sessions.push({
    tokenHash: context.currentSession.tokenHash,
    userId: context.currentUser.id,
    expiresAt: context.currentSession.expiresAt,
    parentVerifiedUntil: context.currentSession.parentVerifiedUntil,
  })
}

export async function applyBackup(
  store: DataStore,
  payload: unknown,
  scopes: BackupScopes,
  context: ApplyBackupContext,
): Promise<ApplyBackupResult> {
  if (!scopes.database && !scopes.vocabulary) {
    throw new BackupError('Select runtime data, vocabulary, or both', 400)
  }
  const document = parseBackup(payload)
  const restored: BackupScope[] = []
  const result: ApplyBackupResult = { restored }

  if (scopes.database) {
    if (!document.database || typeof document.database !== 'object') {
      throw new BackupError('This backup does not include runtime data', 400)
    }
    const next = cloneDatabaseWithoutEphemeral(document.database)
    preserveAdminSession(next, context)
    await store.reset(next)
    restored.push('database')
    result.users = next.users.length
    result.learners = next.learners.length
  }

  if (scopes.vocabulary) {
    if (!document.vocabulary || typeof document.vocabulary !== 'object') {
      throw new BackupError('This backup does not include vocabulary', 400)
    }
    for (const level of VOCABULARY_LEVELS) {
      const file = document.vocabulary[level]
      if (!file || !Array.isArray(file.words)) {
        throw new BackupError(`This backup does not include ${level} vocabulary`, 400)
      }
    }
    result.words = restoreVocabularyFiles(document.vocabulary)
    restored.push('vocabulary')
  }

  return result
}
