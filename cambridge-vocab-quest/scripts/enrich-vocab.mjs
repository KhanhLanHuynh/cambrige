/**
 * Re-enrich weak or POS-mismatched definitions in per-level vocabulary files.
 */
import { applyWordChoices } from './quiz-choices.mjs'
import { loadAllVocabulary, writeVocabularyByLevel } from './vocab-files.mjs'

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isWeak(definition) {
  return /^(A word that means|An action word that means|A describing word related to being|A word that tells us how)/.test(definition)
}

function tidy(definition) {
  let text = definition.replace(/\s+/g, ' ').trim()
  if (!text.endsWith('.') && !text.endsWith('…')) text += '.'
  if (text.length > 140) text = `${text.slice(0, 137).replace(/\s+\S*$/, '')}…`
  return text
}

async function fetchMeaning(word, partOfSpeech, attempt = 1) {
  try {
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`)
    if (response.status === 429 || response.status >= 500) {
      if (attempt < 5) {
        await sleep(500 * attempt)
        return fetchMeaning(word, partOfSpeech, attempt + 1)
      }
      return null
    }
    if (!response.ok) return null
    const data = await response.json()
    const entry = Array.isArray(data) ? data[0] : null
    if (!entry) return null
    const phonetic = entry.phonetic || entry.phonetics?.find((item) => item.text)?.text || ''
    const meanings = entry.meanings ?? []
    const preferred = meanings.find((meaning) => meaning.partOfSpeech === partOfSpeech)
      || meanings[0]
    const definition = preferred?.definitions?.[0]?.definition
    if (!definition) return null
    return { phonetic, definition: tidy(definition) }
  } catch {
    if (attempt < 3) {
      await sleep(400 * attempt)
      return fetchMeaning(word, partOfSpeech, attempt + 1)
    }
    return null
  }
}

async function main() {
  const data = loadAllVocabulary()
  const targets = data.words.filter((word) => {
    if (word.word.includes(' ')) return false
    if (isWeak(word.definition)) return true
    // Also refresh entries likely POS-mismatched (short noun gloss on adjectives/verbs)
    if (word.partOfSpeech === 'adjective' && /^A cause;/.test(word.definition)) return true
    return false
  })

  console.log(`Re-enriching ${targets.length} words…`)
  let updated = 0
  for (let index = 0; index < targets.length; index += 1) {
    const word = targets[index]
    await sleep(50)
    const result = await fetchMeaning(word.word.toLowerCase(), word.partOfSpeech)
    if (result?.definition) {
      word.definition = result.definition
      if (result.phonetic) word.phonetic = result.phonetic
      updated += 1
    }
    if ((index + 1) % 50 === 0 || index + 1 === targets.length) {
      process.stdout.write(`\rChecked ${index + 1}/${targets.length} (updated ${updated})`)
    }
  }
  process.stdout.write('\n')

  for (const word of data.words) {
    if (typeof word.definitionVi !== 'string') word.definitionVi = ''
  }
  applyWordChoices(data.words)

  writeVocabularyByLevel(data.words, {
    ...data.source,
    enrichedAt: new Date().toISOString(),
  })
  console.log(`Done. Updated ${updated}. Weak remaining: ${data.words.filter((word) => isWeak(word.definition)).length}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
