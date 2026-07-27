export type CambridgeLevel = 'Starters' | 'Movers' | 'Flyers' | 'Preliminary'
export type WordHealth = 'Healthy' | 'At risk' | 'Warming' | 'New'

export interface User {
  id: string
  name: string
  email: string
}

export interface Learner {
  id: string
  name: string
  avatar: string
  level: CambridgeLevel
  hasPin: boolean
  streak: number
  gems: number
}

export interface VocabularyWord {
  id: string
  word: string
  phonetic: string
  definition: string
  definitionVi: string
  sentence: string
  sentences?: string[]
  category: string
  partOfSpeech: string
  choices: string[]
  answer: string
  hint: string
  fact: string
  health: WordHealth
  accuracy: number
  quizzes: number
  image?: string
  imageCredit?: string
}

export interface OfflineMutation {
  id?: number
  url: string
  method: string
  body?: unknown
  createdAt: number
}

export interface QuizQuestion {
  id: string
  word: string
  phonetic: string
  definition: string
  definitionVi: string
  sentence: string
  sentences?: string[]
  category: string
  partOfSpeech: string
  choices: string[]
  hint: string
  image?: string
  imageCredit?: string
}

/** Safe vocabulary payload from learner search (no quiz answers). */
export interface VocabularySearchResult {
  id: string
  word: string
  phonetic: string
  definition: string
  sentence: string
  category: string
  partOfSpeech: string
  level: CambridgeLevel
  hint: string
}

export interface QuizSession {
  id: string
  expiresAt: string
  questions: QuizQuestion[]
}

export interface QuizAnswerResult {
  correct: boolean
  answer: string
  definition: string
  fact: string
  complete: boolean
  gemsAwarded?: number
}

export interface LearnerSettings {
  dailyGoal: number
  dailyLimitMinutes: 15 | 30 | 45 | 60
  reviewMix: 10 | 25 | 40
  timedModesEnabled: boolean
  focusMode: boolean
  soundEnabled: boolean
  hintsEnabled: boolean
}

export interface HubQuest {
  id: string
  label: string
  progress: number
  target: number
  reward: number
  claimed: boolean
}

export interface GiftDefinition {
  id: string
  name: string
  costGems: number
}

export interface GiftRedemption {
  id: string
  learnerId: string
  learnerName?: string
  giftId: string
  giftName: string
  costGems: number
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  createdAt: string
  resolvedAt?: string
  learnerGems?: number
}

export interface Achievement {
  id: string
  icon: string
  label: string
  description: string
  unlocked: boolean
}
