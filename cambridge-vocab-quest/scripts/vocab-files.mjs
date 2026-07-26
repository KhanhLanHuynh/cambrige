/**
 * Shared helpers for reading/writing per-level Cambridge vocabulary JSON files.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const dataDir = resolve(root, 'server/data')

export const LEVELS = ['Starters', 'Movers', 'Flyers', 'Preliminary']

const FILE_BY_LEVEL = {
  Starters: 'starters.json',
  Movers: 'movers.json',
  Flyers: 'flyers.json',
  Preliminary: 'preliminary.json',
}

export function levelFilePath(level) {
  return resolve(dataDir, FILE_BY_LEVEL[level])
}

export function loadAllVocabulary() {
  const files = LEVELS.map((level) => {
    const data = JSON.parse(readFileSync(levelFilePath(level), 'utf8'))
    return data
  })
  const source = files[0]?.source ?? {}
  const words = files.flatMap((file) => file.words ?? [])
  return { source, words, files }
}

export function writeVocabularyByLevel(words, source = {}) {
  mkdirSync(dataDir, { recursive: true })
  for (const level of LEVELS) {
    const levelWords = words.filter((word) => word.level === level)
    writeFileSync(levelFilePath(level), `${JSON.stringify({
      source,
      level,
      count: levelWords.length,
      words: levelWords,
    }, null, 2)}\n`)
  }
}
