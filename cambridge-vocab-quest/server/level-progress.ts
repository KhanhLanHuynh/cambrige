import type { CambridgeLevel } from '../shared/types.js'
import { VOCABULARY_LEVELS, vocabulary } from './vocabulary.js'

export const LEVEL_MASTERY_RATIO = 0.8

export const MAP_STOPS = ['nature-valley', 'space-station', 'crystal-caves', 'dragon-ridge'] as const
export type MapStop = (typeof MAP_STOPS)[number]

export const MAP_LEVELS: Record<MapStop, CambridgeLevel> = {
  'nature-valley': 'Starters',
  'space-station': 'Movers',
  'crystal-caves': 'Flyers',
  'dragon-ridge': 'Preliminary',
}

export type CoverageAttempt = {
  wordId: string
  correct: boolean
}

export function levelRank(level: CambridgeLevel): number {
  return VOCABULARY_LEVELS.indexOf(level)
}

export function nextCambridgeLevel(level: CambridgeLevel): CambridgeLevel | null {
  return VOCABULARY_LEVELS[levelRank(level) + 1] ?? null
}

export function uniqueCorrectWordIds(attempts: CoverageAttempt[]): Set<string> {
  const ids = new Set<string>()
  for (const attempt of attempts) {
    if (attempt.correct) ids.add(attempt.wordId)
  }
  return ids
}

export function wordsForLevel(level: CambridgeLevel) {
  return vocabulary.filter((word) => word.level === level)
}

export function requiredCountForLevel(level: CambridgeLevel): number {
  return Math.ceil(LEVEL_MASTERY_RATIO * wordsForLevel(level).length)
}

export function learnedCountForLevel(attempts: CoverageAttempt[], level: CambridgeLevel): number {
  const learned = uniqueCorrectWordIds(attempts)
  let count = 0
  for (const word of wordsForLevel(level)) {
    if (learned.has(word.id)) count += 1
  }
  return count
}

export function coverageForLevel(attempts: CoverageAttempt[], level: CambridgeLevel) {
  const totalCount = wordsForLevel(level).length
  return {
    learnedCount: learnedCountForLevel(attempts, level),
    requiredCount: requiredCountForLevel(level),
    totalCount,
    ratio: LEVEL_MASTERY_RATIO,
  }
}

export function hasLevelCoverage(attempts: CoverageAttempt[], level: CambridgeLevel): boolean {
  return learnedCountForLevel(attempts, level) >= requiredCountForLevel(level)
}

/** Map progress earned from Starters upward, ignoring a parent-set profile level. */
export function earnedLevelFromCoverage(attempts: CoverageAttempt[]): CambridgeLevel {
  let earned: CambridgeLevel = 'Starters'
  for (const level of VOCABULARY_LEVELS) {
    const next = nextCambridgeLevel(level)
    if (!next) break
    if (!hasLevelCoverage(attempts, level)) break
    earned = next
  }
  return earned
}

/** Walk forward from the current profile level while that level is 80% covered. Never demotes. */
export function promotedLevel(attempts: CoverageAttempt[], currentLevel: CambridgeLevel): CambridgeLevel {
  let level = currentLevel
  for (;;) {
    const next = nextCambridgeLevel(level)
    if (!next || !hasLevelCoverage(attempts, level)) return level
    level = next
  }
}

export function highestUnlockedLevel(attempts: CoverageAttempt[], learnerLevel: CambridgeLevel): CambridgeLevel {
  const earned = earnedLevelFromCoverage(attempts)
  return levelRank(earned) >= levelRank(learnerLevel) ? earned : learnerLevel
}

export function mapUnlocks(attempts: CoverageAttempt[], learnerLevel: CambridgeLevel) {
  const effective = highestUnlockedLevel(attempts, learnerLevel)
  const index = levelRank(effective)
  return {
    'nature-valley': levelRank(MAP_LEVELS['nature-valley']) <= index,
    'space-station': levelRank(MAP_LEVELS['space-station']) <= index,
    'crystal-caves': levelRank(MAP_LEVELS['crystal-caves']) <= index,
    'dragon-ridge': levelRank(MAP_LEVELS['dragon-ridge']) <= index,
  }
}

export function levelProgress(attempts: CoverageAttempt[], learnerLevel: CambridgeLevel) {
  const coverage = coverageForLevel(attempts, learnerLevel)
  return {
    level: learnerLevel,
    nextLevel: nextCambridgeLevel(learnerLevel),
    ...coverage,
  }
}
