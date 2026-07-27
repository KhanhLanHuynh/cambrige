export type CambridgeLevel = 'Starters' | 'Movers' | 'Flyers' | 'Preliminary'
export type WordHealth = 'Healthy' | 'At risk' | 'Warming' | 'New'

export interface VocabularyWord {
  id: string
  word: string
  phonetic: string
  definition: string
  definitionVi: string
  sentence: string
  sentences: string[]
  category: string
  partOfSpeech: string
  choices: string[]
  answer: string
  hint: string
  fact: string
  level: CambridgeLevel
  /** Public path to word illustration, e.g. `/assets/images/words/starters-armchair.webp` */
  image?: string
  /** Short open-license attribution (creator, license, source). */
  imageCredit?: string
}

/** Safe vocabulary payload for learner search (no quiz answers). */
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

export interface SafeLearner {
  id: string
  name: string
  avatar: string
  level: CambridgeLevel
  hasPin: boolean
  streak: number
  gems: number
}
