/**
 * Rebuild answer/choices for all vocabulary as definition → pick-the-word MCQs.
 * Does not call external APIs.
 *
 * Usage: node scripts/rebuild-quiz-choices.mjs
 */
import { applyWordChoices } from './quiz-choices.mjs'
import { loadAllVocabulary, writeVocabularyByLevel } from './vocab-files.mjs'

function main() {
  const data = loadAllVocabulary()
  applyWordChoices(data.words)

  let bad = 0
  for (const word of data.words) {
    if (word.answer !== word.word) bad += 1
    if (!word.choices.includes(word.word)) bad += 1
    if (word.choices.length !== 4) bad += 1
    if (word.choices.includes(word.definition)) bad += 1
  }

  writeVocabularyByLevel(data.words, {
    ...data.source,
    quizChoicesRebuiltAt: new Date().toISOString(),
  })

  console.log(`Rebuilt choices for ${data.words.length} words. Issues: ${bad}`)
  if (bad > 0) process.exitCode = 1
}

main()
