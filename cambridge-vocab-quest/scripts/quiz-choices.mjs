/**
 * Shared helpers for definition→pick-the-word MCQ choices.
 */

const FALLBACK_WORDS = [
  'colour',
  'number',
  'weather',
  'music',
  'sleep',
  'friend',
  'garden',
  'river',
]

export function wordDistractors(item, pool) {
  const answer = item.word
  const samePos = pool.filter(
    (word) => word.partOfSpeech === item.partOfSpeech && word.id !== item.id,
  )
  const anyPeer = pool.filter((word) => word.id !== item.id)
  const picks = []

  const tryAdd = (candidate) => {
    const label = candidate?.word
    if (!label || label === answer || picks.includes(label)) return false
    picks.push(label)
    return true
  }

  for (const word of samePos) {
    if (tryAdd(word) && picks.length === 3) return picks
  }
  for (const word of anyPeer) {
    if (tryAdd(word) && picks.length === 3) return picks
  }

  let i = 0
  while (picks.length < 3) {
    const next = FALLBACK_WORDS[i++] || `option-${picks.length + 1}`
    if (next !== answer && !picks.includes(next)) picks.push(next)
  }
  return picks
}

export function shuffleChoices(id, choices) {
  const result = [...choices]
  let hash = 0
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = hash % (i + 1)
    hash = (hash * 2654435761) >>> 0
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/** Mutates words in place: answer = word, choices = 4 peer words. */
export function applyWordChoices(words) {
  const byLevel = {}
  for (const word of words) {
    ;(byLevel[word.level] ??= []).push(word)
  }
  for (const word of words) {
    const pool = byLevel[word.level] || words
    const wrong = wordDistractors(word, pool)
    word.answer = word.word
    word.choices = shuffleChoices(word.id, [...wrong, word.word])
  }
  return words
}
