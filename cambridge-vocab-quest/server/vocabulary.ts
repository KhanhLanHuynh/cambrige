import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { CambridgeLevel, VocabularySearchResult, VocabularyWord, WordHealth } from '../shared/types.js'

type VocabularyFile = {
  source?: Record<string, unknown>
  level: CambridgeLevel
  count: number
  words: VocabularyWord[]
}

const LEVEL_FILES = ['starters.json', 'movers.json', 'flyers.json', 'preliminary.json'] as const

const FILE_BY_LEVEL: Record<CambridgeLevel, (typeof LEVEL_FILES)[number]> = {
  Starters: 'starters.json',
  Movers: 'movers.json',
  Flyers: 'flyers.json',
  Preliminary: 'preliminary.json',
}

const dataDir = resolve(dirname(fileURLToPath(import.meta.url)), 'data')

function levelFilePath(level: CambridgeLevel): string {
  return resolve(dataDir, FILE_BY_LEVEL[level])
}

function loadLevelFile(filename: string): VocabularyWord[] {
  const file = JSON.parse(readFileSync(resolve(dataDir, filename), 'utf8')) as VocabularyFile
  return file.words
}

function readLevelFile(level: CambridgeLevel): VocabularyFile {
  return JSON.parse(readFileSync(levelFilePath(level), 'utf8')) as VocabularyFile
}

function writeLevelFile(level: CambridgeLevel, file: VocabularyFile): void {
  writeFileSync(levelFilePath(level), `${JSON.stringify(file, null, 2)}\n`)
}

export const vocabulary: VocabularyWord[] = LEVEL_FILES.flatMap(loadLevelFile)

export function getWordById(id: string): VocabularyWord | undefined {
  return vocabulary.find((word) => word.id === id)
}

export function updateWordSentences(id: string, sentences: string[]): VocabularyWord {
  const word = getWordById(id)
  if (!word) throw new Error(`Word not found: ${id}`)

  const cleaned = sentences.map((sentence) => sentence.trim()).filter(Boolean)
  word.sentences = cleaned

  const file = readLevelFile(word.level)
  const index = file.words.findIndex((entry) => entry.id === id)
  if (index < 0) throw new Error(`Word missing from level file: ${id}`)
  file.words[index] = { ...file.words[index]!, sentences: cleaned }
  writeLevelFile(word.level, file)

  return word
}

export function listCategories(level?: CambridgeLevel): string[] {
  const pool = level ? vocabulary.filter((word) => word.level === level) : vocabulary
  return [...new Set(pool.map((word) => word.category))].sort((a, b) => a.localeCompare(b))
}

function toSearchResult(word: VocabularyWord): VocabularySearchResult {
  return {
    id: word.id,
    word: word.word,
    phonetic: word.phonetic,
    definition: word.definition,
    sentences: word.sentences,
    category: word.category,
    partOfSpeech: word.partOfSpeech,
    level: word.level,
    hint: word.hint,
  }
}

export function searchVocabulary(query: string, options: {
  level?: CambridgeLevel
  limit?: number
} = {}): VocabularySearchResult[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return []

  const limit = Math.min(25, Math.max(1, options.limit ?? 12))
  const pool = options.level
    ? vocabulary.filter((word) => word.level === options.level)
    : vocabulary

  const scored: Array<{ word: VocabularyWord; score: number }> = []
  for (const word of pool) {
    const name = word.word.toLowerCase()
    const definition = word.definition.toLowerCase()
    const category = word.category.toLowerCase()
    let score = 0
    if (name.startsWith(needle)) score = 3
    else if (name.includes(needle)) score = 2
    else if (definition.includes(needle) || category.includes(needle)) score = 1
    else continue
    scored.push({ word, score })
  }

  scored.sort((left, right) =>
    right.score - left.score || left.word.word.localeCompare(right.word.word))
  return scored.slice(0, limit).map((item) => toSearchResult(item.word))
}

function shuffled<T>(items: readonly T[]): T[] {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    const current = result[index]
    const swap = result[swapIndex]
    if (current !== undefined && swap !== undefined) {
      result[index] = swap
      result[swapIndex] = current
    }
  }
  return result
}

export interface WordAttemptSummary {
  wordId: string
  health: WordHealth
  accuracy: number
}

export function selectVocabulary(options: {
  count: number
  level?: CambridgeLevel
  category?: string
  categories?: string[]
  reviewMix?: number
  reviewOnly?: boolean
  focusWordIds?: string[]
  wordHealth?: WordAttemptSummary[]
}): VocabularyWord[] {
  const categorySet = options.categories?.length
    ? new Set(options.categories.map((item) => item.toLowerCase()))
    : null
  let pool = vocabulary.filter((word) =>
    (!options.category || word.category === options.category)
    && (!categorySet || categorySet.has(word.category.toLowerCase()))
    && (!options.level || word.level === options.level),
  )

  if (!pool.length && categorySet) {
    pool = vocabulary.filter((word) => !options.level || word.level === options.level)
  }

  const healthById = new Map((options.wordHealth ?? []).map((item) => [item.wordId, item]))
  const reviewPool = shuffled(pool.filter((word) => {
    const health = healthById.get(word.id)?.health
    return health === 'At risk' || health === 'Warming'
  }))
  const unseenPool = shuffled(pool.filter((word) => !healthById.has(word.id)))
  const otherPool = shuffled(pool.filter((word) => {
    const health = healthById.get(word.id)?.health
    return health === 'Healthy' || health === 'New'
  }))
  const practisedPool = shuffled(pool.filter((word) => healthById.has(word.id)))

  const selected: VocabularyWord[] = []
  const selectedIds = new Set<string>()
  const take = (source: VocabularyWord[], needed: number) => {
    for (const word of source) {
      if (selected.length >= options.count || needed <= 0) break
      if (selectedIds.has(word.id)) continue
      selected.push(word)
      selectedIds.add(word.id)
      needed -= 1
    }
  }

  if (options.focusWordIds?.length) {
    const focusWords = options.focusWordIds
      .map((id) => vocabulary.find((word) => word.id === id))
      .filter((word): word is VocabularyWord => Boolean(word))
    take(focusWords, focusWords.length)
    take(reviewPool, options.count - selected.length)
    take(practisedPool, options.count - selected.length)
    take(unseenPool, options.count - selected.length)
    take(shuffled(pool), options.count - selected.length)
    return selected
  }

  if (options.reviewOnly) {
    take(reviewPool, options.count)
    take(practisedPool, options.count - selected.length)
    take(otherPool, options.count - selected.length)
    take(shuffled(pool), options.count - selected.length)
    return selected
  }

  const reviewMix = options.reviewMix ?? 0
  if (reviewMix > 0 && (reviewPool.length || unseenPool.length)) {
    const reviewCount = Math.min(pool.length, Math.round(options.count * (reviewMix / 100)))
    take(reviewPool, reviewCount)
    take(unseenPool, options.count - selected.length)
    take(otherPool, options.count - selected.length)
    take(shuffled(pool), options.count - selected.length)
    return shuffled(selected)
  }

  if (options.level || categorySet || options.category) {
    return shuffled(pool).slice(0, options.count)
  }

  const flyersCount = Math.round(options.count * 0.7)
  const moversCount = Math.round(options.count * 0.2)
  const startersCount = Math.max(0, options.count - flyersCount - moversCount)
  const mixed = [
    ...shuffled(pool.filter((word) => word.level === 'Flyers')).slice(0, flyersCount),
    ...shuffled(pool.filter((word) => word.level === 'Movers')).slice(0, moversCount),
    ...shuffled(pool.filter((word) => word.level === 'Starters')).slice(0, startersCount),
  ]
  const mixedIds = new Set(mixed.map((word) => word.id))
  const remainder = shuffled(pool.filter((word) => word.level !== 'Preliminary' && !mixedIds.has(word.id)))
  return shuffled([...mixed, ...remainder.slice(0, Math.max(0, options.count - mixed.length))])
}
