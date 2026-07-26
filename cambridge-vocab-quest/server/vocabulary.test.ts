import { describe, expect, it } from 'vitest'
import { searchVocabulary, selectVocabulary, vocabulary } from './vocabulary.js'

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
