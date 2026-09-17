import { describe, expect, it } from 'vitest'
import {
  coverageForLevel,
  earnedLevelFromCoverage,
  hasLevelCoverage,
  highestUnlockedLevel,
  LEVEL_MASTERY_RATIO,
  levelProgress,
  mapUnlocks,
  promotedLevel,
  requiredCountForLevel,
  uniqueCorrectWordIds,
} from './level-progress.js'
import { vocabulary } from './vocabulary.js'

function attemptsFor(wordIds: string[], correct = true) {
  return wordIds.map((wordId) => ({ wordId, correct }))
}

function idsForLevel(level: 'Starters' | 'Movers' | 'Flyers' | 'Preliminary', count: number) {
  const ids = vocabulary.filter((word) => word.level === level).slice(0, count).map((word) => word.id)
  expect(ids).toHaveLength(count)
  return ids
}

describe('level coverage progress', () => {
  it('uses an 80% unique-correct rule from live vocabulary counts', () => {
    expect(LEVEL_MASTERY_RATIO).toBe(0.8)
    expect(requiredCountForLevel('Starters')).toBe(Math.ceil(0.8 * vocabulary.filter((word) => word.level === 'Starters').length))
    expect(requiredCountForLevel('Movers')).toBe(Math.ceil(0.8 * vocabulary.filter((word) => word.level === 'Movers').length))
    expect(requiredCountForLevel('Flyers')).toBe(Math.ceil(0.8 * vocabulary.filter((word) => word.level === 'Flyers').length))
  })

  it('does not promote when unique correct words are below 80%', () => {
    const required = requiredCountForLevel('Starters')
    const attempts = attemptsFor(idsForLevel('Starters', required - 1))
    expect(hasLevelCoverage(attempts, 'Starters')).toBe(false)
    expect(promotedLevel(attempts, 'Starters')).toBe('Starters')
    expect(earnedLevelFromCoverage(attempts)).toBe('Starters')
  })

  it('promotes at exactly ceil(80%) unique correct words', () => {
    const required = requiredCountForLevel('Starters')
    const attempts = attemptsFor(idsForLevel('Starters', required))
    expect(hasLevelCoverage(attempts, 'Starters')).toBe(true)
    expect(promotedLevel(attempts, 'Starters')).toBe('Movers')
    expect(earnedLevelFromCoverage(attempts)).toBe('Movers')
  })

  it('ignores repeating the same word', () => {
    const [word] = idsForLevel('Starters', 1)
    const attempts = Array.from({ length: requiredCountForLevel('Starters') }, () => ({
      wordId: word!,
      correct: true,
    }))
    expect(uniqueCorrectWordIds(attempts).size).toBe(1)
    expect(promotedLevel(attempts, 'Starters')).toBe('Starters')
  })

  it('does not count incorrect answers as learned', () => {
    const required = requiredCountForLevel('Starters')
    const attempts = attemptsFor(idsForLevel('Starters', required), false)
    expect(promotedLevel(attempts, 'Starters')).toBe('Starters')
  })

  it('does not demote a parent-created Flyers learner without Flyers coverage', () => {
    const starters = attemptsFor(idsForLevel('Starters', requiredCountForLevel('Starters')))
    expect(promotedLevel(starters, 'Flyers')).toBe('Flyers')
    expect(highestUnlockedLevel(starters, 'Flyers')).toBe('Flyers')
    expect(mapUnlocks([], 'Flyers')).toMatchObject({
      'nature-valley': true,
      'space-station': true,
      'crystal-caves': true,
      'dragon-ridge': false,
    })
  })

  it('promotes a Flyers learner to Preliminary after 80% unique Flyers words', () => {
    const attempts = attemptsFor(idsForLevel('Flyers', requiredCountForLevel('Flyers')))
    expect(promotedLevel(attempts, 'Flyers')).toBe('Preliminary')
    expect(earnedLevelFromCoverage(attempts)).toBe('Starters')
  })

  it('can skip more than one level when later coverage is already present', () => {
    const attempts = [
      ...attemptsFor(idsForLevel('Starters', requiredCountForLevel('Starters'))),
      ...attemptsFor(idsForLevel('Movers', requiredCountForLevel('Movers'))),
    ]
    expect(promotedLevel(attempts, 'Starters')).toBe('Flyers')
    expect(earnedLevelFromCoverage(attempts)).toBe('Flyers')
  })

  it('reports current-level progress for the hub', () => {
    const learned = 12
    const attempts = attemptsFor(idsForLevel('Starters', learned))
    expect(coverageForLevel(attempts, 'Starters')).toMatchObject({
      learnedCount: learned,
      requiredCount: requiredCountForLevel('Starters'),
      ratio: 0.8,
    })
    expect(levelProgress(attempts, 'Starters')).toMatchObject({
      level: 'Starters',
      nextLevel: 'Movers',
      learnedCount: learned,
    })
    expect(levelProgress([], 'Preliminary').nextLevel).toBeNull()
  })
})
