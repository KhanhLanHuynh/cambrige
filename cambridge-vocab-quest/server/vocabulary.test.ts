import { describe, expect, it } from 'vitest'
import { getWordById, restoreVocabularyFiles, searchVocabulary, selectVocabulary, snapshotVocabularyFiles, vocabulary } from './vocabulary.js'

describe('vocabulary quiz shape', () => {
  it('uses the word as the answer with word choices, not the definition', () => {
    expect(vocabulary.length).toBeGreaterThan(0)
    for (const word of vocabulary) {
      expect(word.answer).toBe(word.word)
      expect(word.choices).toHaveLength(4)
      expect(word.choices).toContain(word.word)
      expect(new Set(word.choices).size).toBe(4)
      expect(word.choices).not.toContain(word.definition)
    }
  })
})

describe('selectVocabulary', () => {
  it('uses the 70/20/10 Flyers, Movers, and Starters mix', () => {
    const words = selectVocabulary({ count: 10 })

    expect(words).toHaveLength(10)
    expect(words.filter((word) => word.level === 'Flyers')).toHaveLength(7)
    expect(words.filter((word) => word.level === 'Movers')).toHaveLength(2)
    expect(words.filter((word) => word.level === 'Starters')).toHaveLength(1)
  })

  it('honours an explicit level', () => {
    const words = selectVocabulary({ count: 2, level: 'Movers' })

    expect(words).toHaveLength(2)
    expect(words.every((word) => word.level === 'Movers')).toBe(true)
  })

  it('includes one word from each lower level when requested', () => {
    const words = selectVocabulary({
      count: 8,
      level: 'Flyers',
      includeOneFromEachLowerLevel: true,
    })

    expect(words).toHaveLength(8)
    expect(words.filter((word) => word.level === 'Starters')).toHaveLength(1)
    expect(words.filter((word) => word.level === 'Movers')).toHaveLength(1)
    expect(words.filter((word) => word.level === 'Flyers')).toHaveLength(6)
  })

  it('keeps Starters-only when there is no lower level', () => {
    const words = selectVocabulary({
      count: 6,
      level: 'Starters',
      includeOneFromEachLowerLevel: true,
    })

    expect(words).toHaveLength(6)
    expect(words.every((word) => word.level === 'Starters')).toBe(true)
  })

  it('prefers at-risk words when reviewMix is set', () => {
    const words = selectVocabulary({
      count: 4,
      level: 'Movers',
      reviewMix: 40,
      wordHealth: [
        { wordId: 'movers-asleep', health: 'At risk', accuracy: 20 },
      ],
    })

    expect(words).toHaveLength(4)
    expect(words.some((word) => word.id === 'movers-asleep')).toBe(true)
  })
})

describe('searchVocabulary', () => {
  it('returns empty results for blank queries', () => {
    expect(searchVocabulary('')).toEqual([])
    expect(searchVocabulary('   ')).toEqual([])
  })

  it('ranks word prefix matches first and omits quiz secrets', () => {
    const results = searchVocabulary('arm', { limit: 5 })
    expect(results.length).toBeGreaterThan(0)
    expect(results[0]?.word.toLowerCase().startsWith('arm')).toBe(true)
    expect(results[0]).toMatchObject({
      id: expect.any(String),
      word: expect.any(String),
      definition: expect.any(String),
      level: expect.any(String),
    })
    expect(results[0]).not.toHaveProperty('answer')
    expect(results[0]).not.toHaveProperty('choices')
    expect(results[0]).not.toHaveProperty('fact')
  })

  it('filters by level when provided', () => {
    const results = searchVocabulary('a', { level: 'Starters', limit: 10 })
    expect(results.length).toBeGreaterThan(0)
    expect(results.every((word) => word.level === 'Starters')).toBe(true)
  })
})

describe('vocabulary backup snapshot', () => {
  it('restores level files into memory', () => {
    const snapshot = snapshotVocabularyFiles()
    const sample = snapshot.Starters.words[0]
    expect(sample).toBeTruthy()
    const mutated = structuredClone(snapshot)
    mutated.Starters.words[0] = { ...sample!, definition: 'BACKUP-RESTORE-TEST-DEFINITION' }
    try {
      restoreVocabularyFiles(mutated)
      expect(getWordById(sample!.id)?.definition).toBe('BACKUP-RESTORE-TEST-DEFINITION')
    } finally {
      restoreVocabularyFiles(snapshot)
    }
    expect(getWordById(sample!.id)?.definition).toBe(sample!.definition)
  })
})
