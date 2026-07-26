/**
 * Fill empty definitionVi fields by translating English definitions (EN → VI).
 * Uses Google translate_a (gtx client). Skips words that already have definitionVi.
 * Deduplicates identical English definitions via an in-memory cache.
 *
 * Usage: node scripts/translate-definition-vi.mjs [--level Starters|Movers|Flyers|Preliminary]
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { LEVELS, levelFilePath, loadAllVocabulary } from './vocab-files.mjs'

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function translateEnToVi(text, attempt = 1) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&q=${encodeURIComponent(text)}`
  try {
    const response = await fetch(url)
    if (response.status === 429 || response.status >= 500) {
      if (attempt < 6) {
        await sleep(600 * attempt)
        return translateEnToVi(text, attempt + 1)
      }
      throw new Error(`HTTP ${response.status}`)
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data = await response.json()
    const translated = Array.isArray(data?.[0])
      ? data[0].map((part) => part?.[0] ?? '').join('').trim()
      : ''
    if (!translated) throw new Error('Empty translation')
    return translated
  } catch (error) {
    if (attempt < 4) {
      await sleep(400 * attempt)
      return translateEnToVi(text, attempt + 1)
    }
    throw error
  }
}

function saveLevel(level, words, source) {
  const levelWords = words.filter((word) => word.level === level)
  writeFileSync(levelFilePath(level), `${JSON.stringify({
    source,
    level,
    count: levelWords.length,
    words: levelWords,
  }, null, 2)}\n`)
}

async function main() {
  const levelArgIndex = process.argv.indexOf('--level')
  const onlyLevel = levelArgIndex >= 0 ? process.argv[levelArgIndex + 1] : null
  if (onlyLevel && !LEVELS.includes(onlyLevel)) {
    throw new Error(`Unknown level: ${onlyLevel}. Expected one of ${LEVELS.join(', ')}`)
  }

  const data = loadAllVocabulary()
  const cache = new Map()
  for (const word of data.words) {
    if (word.definitionVi?.trim()) cache.set(word.definition, word.definitionVi.trim())
  }

  const targets = data.words.filter((word) => {
    if (onlyLevel && word.level !== onlyLevel) return false
    return !word.definitionVi?.trim()
  })

  console.log(`Translating ${targets.length} definitions${onlyLevel ? ` (${onlyLevel})` : ''}…`)
  let updated = 0
  let failed = 0
  let lastSaveAt = Date.now()

  for (let index = 0; index < targets.length; index += 1) {
    const word = targets[index]
    try {
      let vi = cache.get(word.definition)
      if (!vi) {
        await sleep(40)
        vi = await translateEnToVi(word.definition)
        cache.set(word.definition, vi)
      }
      word.definitionVi = vi
      updated += 1
    } catch (error) {
      failed += 1
      console.error(`\nFailed ${word.id}: ${error.message}`)
    }

    const now = Date.now()
    if (now - lastSaveAt > 15_000 || index + 1 === targets.length) {
      const source = {
        ...data.source,
        definitionViTranslatedAt: new Date().toISOString(),
      }
      const levelsToSave = onlyLevel ? [onlyLevel] : LEVELS
      for (const level of levelsToSave) saveLevel(level, data.words, source)
      lastSaveAt = now
    }

    if ((index + 1) % 25 === 0 || index + 1 === targets.length) {
      process.stdout.write(`\rDone ${index + 1}/${targets.length} (updated ${updated}, failed ${failed}, cache ${cache.size})`)
    }
  }

  process.stdout.write('\n')
  console.log(`Finished. Updated ${updated}, failed ${failed}.`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
