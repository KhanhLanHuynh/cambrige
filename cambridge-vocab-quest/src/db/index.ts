import { openDB, type DBSchema } from 'idb'
import type { OfflineMutation } from '../types'

interface QuestDB extends DBSchema {
  cache: {
    key: string
    value: { key: string; value: unknown; updatedAt: number }
  }
  queue: {
    key: number
    value: OfflineMutation
  }
}

const database = typeof indexedDB === 'undefined'
  ? null
  : openDB<QuestDB>('cambridge-vocab-quest', 1, {
      upgrade(db) {
        db.createObjectStore('cache', { keyPath: 'key' })
        db.createObjectStore('queue', { keyPath: 'id', autoIncrement: true })
      },
    })

export async function getCached<T>(key: string): Promise<T | undefined> {
  const db = await database
  const entry = await db?.get('cache', key)
  return entry?.value as T | undefined
}

export async function setCached(key: string, value: unknown) {
  const db = await database
  await db?.put('cache', { key, value, updatedAt: Date.now() })
}

export async function queueMutation(mutation: OfflineMutation) {
  const db = await database
  await db?.add('queue', mutation)
}

export async function flushQueue(send: (mutation: OfflineMutation) => Promise<void>) {
  const db = await database
  if (!db) return
  const pending = await db.getAll('queue')
  for (const mutation of pending) {
    await send(mutation)
    if (mutation.id !== undefined) await db.delete('queue', mutation.id)
  }
}
