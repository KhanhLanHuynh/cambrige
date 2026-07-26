/**
 * Build quiz-ready vocabulary from official Cambridge English wordlist extracts.
 * Sources (freely published by Cambridge for exam prep):
 * - Pre A1 Starters / A1 Movers / A2 Flyers Wordlists 2025
 * - B1 Preliminary Vocabulary List August 2025
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { writeVocabularyByLevel } from './vocab-files.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ylePath = resolve(root, 'scripts/yle-wordlist-2025.txt')
const petPath = resolve(root, 'scripts/preliminary-wordlist-2025.txt')

const CONTENT_POS = new Set(['noun', 'verb', 'adjective', 'adverb'])
const POS_MAP = {
  n: 'noun',
  v: 'verb',
  adj: 'adjective',
  adv: 'adverb',
  conj: 'conjunction',
  det: 'determiner',
  prep: 'preposition',
  pron: 'pronoun',
  excl: 'exclamation',
  dis: 'discourse marker',
  int: 'interrogative',
  poss: 'possessive',
  title: 'title',
  av: 'verb',
  mv: 'verb',
  'phr v': 'verb',
  pl: 'noun',
  sing: 'noun',
  abbrev: 'noun',
}

const THEME_HINTS = [
  [/animal|zoo|pet|bird|fish|cat|dog|horse|lion|tiger|bear|monkey|frog|snake|insect|butterfly|whale|dolphin|penguin/, 'animals'],
  [/food|drink|eat|fruit|vegetable|bread|cake|milk|juice|lunch|dinner|breakfast|hungry|thirsty|cook|kitchen/, 'food'],
  [/school|class|lesson|teacher|homework|book|pencil|read|write|learn|library|dictionary/, 'school'],
  [/family|friend|mother|father|brother|sister|parent|people|person|child/, 'people'],
  [/home|house|room|bed|door|window|garden|flat|apartment|kitchen|bathroom/, 'home'],
  [/sport|ball|swim|run|jump|football|tennis|game|play|team/, 'sports'],
  [/travel|train|bus|plane|car|journey|airport|holiday|trip|ticket/, 'travel'],
  [/weather|rain|sun|cloud|wind|snow|hot|cold|storm/, 'weather'],
  [/city|town|street|shop|park|bridge|castle|factory|station|building/, 'places'],
  [/body|face|arm|leg|hand|head|eye|ear|nose|hair|tooth/, 'body'],
  [/clothes|shirt|dress|shoe|hat|jacket|coat|wear|skirt/, 'clothes'],
  [/health|doctor|hospital|ill|sick|hurt|medicine|nurse/, 'health'],
  [/science|earth|space|astronaut|environment|nature|plant|tree|forest/, 'nature'],
  [/tech|computer|internet|phone|email|website|app|machine/, 'technology'],
  [/happy|sad|angry|afraid|brave|feel|emotion|surprised|excited/, 'feelings'],
  [/time|day|week|month|year|morning|afternoon|evening|clock|hour/, 'time'],
  [/history|ancient|century|museum|castle/, 'history'],
  [/work|job|office|factory|engineer|artist|actor/, 'jobs'],
]

function themeFor(word) {
  const lower = word.toLowerCase()
  for (const [re, theme] of THEME_HINTS) {
    if (re.test(lower)) return theme
  }
  return 'general'
}

function slugify(word, level) {
  return `${level.toLowerCase()}-${word.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`
}

function cleanLemma(raw) {
  return raw
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\s*\(UK[^)]*\)/gi, '')
    .replace(/\s*\(US[^)]*\)/gi, '')
    .replace(/\s*\(Br Eng[^)]*\)/gi, '')
    .replace(/\s*\(Am Eng[^)]*\)/gi, '')
    .replace(/\s*\(as in[^)]*\)/gi, '')
    .replace(/\s*\(e\.g\.[^)]*\)/gi, '')
    .replace(/\s*\(for [^)]*\)/gi, '')
    .replace(/\s*\(i\.e\.[^)]*\)/gi, '')
    .replace(/\s*\(music\)/gi, '')
    .replace(/\s*\(computer\)/gi, '')
    .replace(/\s*\(s \+ pl\)/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function primaryForm(lemma) {
  // Prefer the first alternative for slash forms: child/children → child
  const base = lemma.split('/')[0].trim()
  // Drop leading articles in rare cases
  return base.replace(/^(a|an|the)\s+/i, '').trim()
}

function isSkippableLemma(lemma) {
  if (!lemma || lemma.length < 2) return true
  if (/^[A-Z][a-z]+$/.test(lemma)) return true // proper names like Alex
  if (/^\d/.test(lemma)) return true
  if (lemma === '(No words at this level)') return true
  // Pure function/grammar tokens often too weak for MCQ vocab quests
  const blocked = new Set(['a', 'an', 'the', 'and', 'or', 'but', 'to', 'of', 'in', 'on', 'at', 'is', 'be', 'am', 'are', 'was', 'were', 'do', 'does', 'did', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'my', 'your', 'his', 'her', 'its', 'our', 'their'])
  return blocked.has(lemma.toLowerCase())
}

function extractYleSection(text, startHeading, endHeading) {
  const start = text.indexOf(startHeading)
  if (start < 0) throw new Error(`Missing section: ${startHeading}`)
  const from = start + startHeading.length
  const end = endHeading ? text.indexOf(endHeading, from) : text.length
  return text.slice(from, end < 0 ? text.length : end)
}

function parseYleEntries(sectionText) {
  const posPattern = String.raw`(?:n|v|adj|adv|conj|det|prep|pron|excl|dis|int|poss|title)`
  // Match lemma + primary POS (ignore trailing "of place/time" notes and +alt POS)
  const re = new RegExp(
    String.raw`([A-Za-z][A-Za-z0-9'’./() -]*?)\s+(${posPattern})(?:\s*\+\s*${posPattern})*(?:\s+of\s+(?:place|time))?`,
    'g',
  )
  const found = []
  for (const match of sectionText.matchAll(re)) {
    const rawLemma = cleanLemma(match[1])
    const pos = POS_MAP[match[2]]
    if (!pos || !CONTENT_POS.has(pos)) continue
    const lemma = primaryForm(rawLemma)
    if (isSkippableLemma(lemma)) continue
    // Skip page chrome leftovers
    if (/wordlist|grammatical|candidates|contents|introduction/i.test(lemma)) continue
    found.push({ word: lemma.toLowerCase(), partOfSpeech: pos, display: lemma })
  }
  return found
}

function parsePreliminary(text) {
  // Cut appendix/topic lists if present
  const cutMarkers = ['Appendix 1', 'Appendix 2', 'Topic lists', 'TOPIC LISTS']
  let body = text
  for (const marker of cutMarkers) {
    const idx = body.indexOf(marker)
    if (idx > 5000) {
      body = body.slice(0, idx)
      break
    }
  }

  const found = []
  const re = /([A-Za-z][A-Za-z0-9'’./&\- ]*?)\s*\(([^)]+)\)/g
  for (const match of body.matchAll(re)) {
    const rawLemma = cleanLemma(match[1].replace(/^•\s*/, '').replace(/^-\s*/, ''))
    if (!rawLemma || rawLemma.includes('•')) continue
    const tags = match[2].toLowerCase()
    let pos
    if (/\bn\b/.test(tags) || /\bpl\b/.test(tags) || /\bsing\b/.test(tags)) pos = 'noun'
    else if (/\bv\b/.test(tags) || /phr v/.test(tags) || /\bav\b/.test(tags) || /\bmv\b/.test(tags)) pos = 'verb'
    else if (/\badj\b/.test(tags)) pos = 'adjective'
    else if (/\badv\b/.test(tags)) pos = 'adverb'
    else continue

    const lemma = primaryForm(rawLemma.replace(/\s*&\s*.*$/, '').trim())
    if (isSkippableLemma(lemma)) continue
    if (/preliminary|vocabulary|introduction|organisation|summary/i.test(lemma)) continue
    found.push({ word: lemma.toLowerCase(), partOfSpeech: pos, display: lemma })
  }
  return found
}

function uniqByWord(items) {
  const map = new Map()
  for (const item of items) {
    if (!map.has(item.word)) map.set(item.word, item)
  }
  return [...map.values()]
}

function sentenceFor(word, pos) {
  if (pos === 'verb') return `We often ${word} when we practise English.`
  if (pos === 'adjective') return `The story was very ${word}.`
  if (pos === 'adverb') return `Please speak ${word}.`
  return `Look at the ${word} in the picture.`
}

function definitionFor(word, pos, apiDefinition) {
  if (apiDefinition) return apiDefinition
  if (pos === 'verb') return `An action word that means to ${word}.`
  if (pos === 'adjective') return `A describing word related to being ${word}.`
  if (pos === 'adverb') return `A word that tells us how something happens: ${word}.`
  return `A word that means ${word}.`
}

function articleFor(word) {
  return /^[aeiou]/i.test(word) ? 'an' : 'a'
}

function hintFor(word, pos) {
  if (pos === 'verb') return `Try using “to ${word}” in a short sentence.`
  if (pos === 'adjective') return `It describes how something is.`
  if (pos === 'adverb') return `It often describes how an action is done.`
  return `Think about what ${articleFor(word)} ${word} is.`
}

/** Temporary fact until `npm run vocab:facts` fills kid-friendly SPACE FACTs. */
function factFor(word, definition, partOfSpeech) {
  const label = `${word[0].toUpperCase()}${word.slice(1)}`
  let gloss = String(definition || '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(/[.;]/)[0]
    ?.trim()
    .toLowerCase() || ''
  if (gloss.length > 70) gloss = `${gloss.slice(0, 67).replace(/\s+\S*$/, '')}…`
  if (!gloss) {
    if (partOfSpeech === 'verb') return `Try using the action word ${word} in a short sentence.`
    if (partOfSpeech === 'adjective') return `${label} is a describing word — notice it in stories.`
    if (partOfSpeech === 'adverb') return `${label} tells how something is done.`
    return `${label} is a useful word to practise in English class.`
  }
  if (partOfSpeech === 'verb') return `To ${word} means ${gloss}.`
  if (partOfSpeech === 'adjective') return `When something is ${word}, it is ${gloss}.`
  return `${label} means ${gloss}.`
}

function distractors(word, pos, pool, answer) {
  const samePos = pool.filter((item) => item.partOfSpeech === pos && item.word !== word)
  const anyPeer = pool.filter((item) => item.word !== word)
  const picks = []
  const tryAdd = (label) => {
    if (!label || label === answer || picks.includes(label)) return false
    picks.push(label)
    return true
  }
  for (const item of samePos) {
    if (tryAdd(item.word) && picks.length === 3) return picks
  }
  for (const item of anyPeer) {
    if (tryAdd(item.word) && picks.length === 3) return picks
  }
  const fallback = ['colour', 'number', 'weather', 'music', 'sleep', 'friend']
  let i = 0
  while (picks.length < 3) {
    const next = fallback[i++] || `option-${picks.length + 1}`
    if (next !== answer && !picks.includes(next)) picks.push(next)
  }
  return picks
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchDictionary(word, preferredPos = '', attempt = 1) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 12_000)
  try {
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
    if (response.status === 429 || response.status >= 500) {
      if (attempt < 4) {
        await sleep(400 * attempt)
        return fetchDictionary(word, preferredPos, attempt + 1)
      }
      return null
    }
    if (!response.ok) return null
    const data = await response.json()
    const entry = Array.isArray(data) ? data[0] : null
    if (!entry) return null
    const phonetic = entry.phonetic
      || entry.phonetics?.find((item) => item.text)?.text
      || ''

    const meanings = entry.meanings ?? []
    const ranked = [...meanings].sort((a, b) => {
      const aMatch = preferredPos && a.partOfSpeech === preferredPos ? 0 : 1
      const bMatch = preferredPos && b.partOfSpeech === preferredPos ? 0 : 1
      return aMatch - bMatch
    })

    let definition = ''
    for (const meaning of ranked) {
      for (const item of meaning.definitions ?? []) {
        const first = item.definition?.replace(/\s+/g, ' ').trim()
        if (!first) continue
        // Skip circular / unhelpful defs
        if (new RegExp(`^(an? )?${word}\\b`, 'i').test(first)) continue
        if (/^a word that means/i.test(first)) continue
        definition = first
        if (!definition.endsWith('.')) definition += '.'
        if (definition.length > 140) definition = `${definition.slice(0, 137).replace(/\s+\S*$/, '')}…`
        break
      }
      if (definition) break
    }
    return definition ? { phonetic, definition } : null
  } catch {
    if (attempt < 3) {
      await sleep(300 * attempt)
      return fetchDictionary(word, preferredPos, attempt + 1)
    }
    return null
  } finally {
    clearTimeout(timer)
  }
}

async function mapPool(items, concurrency, worker) {
  const results = new Array(items.length)
  let index = 0
  async function run() {
    while (index < items.length) {
      const current = index
      index += 1
      results[current] = await worker(items[current], current)
      if ((current + 1) % 50 === 0 || current + 1 === items.length) {
        process.stdout.write(`\rEnriching ${current + 1}/${items.length}`)
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => run()))
  process.stdout.write('\n')
  return results
}

async function main() {
  const yleText = readFileSync(ylePath, 'utf8')
  const petText = readFileSync(petPath, 'utf8')

  const startersRaw = uniqByWord(parseYleEntries(extractYleSection(
    yleText,
    '## Pre A1 Starters A–Z wordlist',
    '## A1 Movers A–Z wordlist',
  )))
  const moversRaw = uniqByWord(parseYleEntries(extractYleSection(
    yleText,
    '## A1 Movers A–Z wordlist',
    '## A2 Flyers A–Z wordlist',
  )))
  const flyersRaw = uniqByWord(parseYleEntries(extractYleSection(
    yleText,
    '## A2 Flyers A–Z wordlist',
    '## Pre A1 Starters and A1 Movers alphabetic vocabulary list',
  )))
  const preliminaryRaw = uniqByWord(parsePreliminary(petText))

  const startersSet = new Set(startersRaw.map((item) => item.word))
  const moversSet = new Set(moversRaw.map((item) => item.word))
  const flyersSet = new Set(flyersRaw.map((item) => item.word))
  const yleSet = new Set([...startersSet, ...moversSet, ...flyersSet])

  const leveled = [
    ...startersRaw.map((item) => ({ ...item, level: 'Starters' })),
    ...moversRaw.filter((item) => !startersSet.has(item.word)).map((item) => ({ ...item, level: 'Movers' })),
    ...flyersRaw.filter((item) => !startersSet.has(item.word) && !moversSet.has(item.word)).map((item) => ({ ...item, level: 'Flyers' })),
    ...preliminaryRaw
      .filter((item) => !yleSet.has(item.word))
      .map((item) => ({ ...item, level: 'Preliminary' })),
  ]

  console.log('Parsed counts:', {
    Starters: leveled.filter((item) => item.level === 'Starters').length,
    Movers: leveled.filter((item) => item.level === 'Movers').length,
    Flyers: leveled.filter((item) => item.level === 'Flyers').length,
    Preliminary: leveled.filter((item) => item.level === 'Preliminary').length,
    total: leveled.length,
  })

  // Enrich single-token lemmas via Free Dictionary (YLE + Preliminary).
  const uniqueWords = [...new Set(
    leveled
      .map((item) => item.word)
      .filter((word) => !word.includes(' ') && !/[0-9]/.test(word)),
  )]
  const dictMap = new Map()
  const dictResults = await mapPool(uniqueWords, 4, async (word) => {
    await sleep(40)
    const result = await fetchDictionary(word)
    return [word, result]
  })
  for (const [word, result] of dictResults) dictMap.set(word, result)
  console.log('Dictionary hits:', [...dictMap.values()].filter(Boolean).length, '/', uniqueWords.length)

  // First pass: create entries with definitions
  const draft = leveled.map((item) => {
    const api = dictMap.get(item.word)
    const definition = definitionFor(item.display, item.partOfSpeech, api?.definition)
    return {
      id: slugify(item.word, item.level),
      word: item.display,
      phonetic: api?.phonetic || '',
      definition,
      definitionVi: '',
      sentence: sentenceFor(item.display, item.partOfSpeech),
      category: themeFor(item.word),
      partOfSpeech: item.partOfSpeech,
      hint: hintFor(item.display, item.partOfSpeech),
      fact: factFor(item.display, definition, item.partOfSpeech),
      level: item.level,
      answer: item.display,
    }
  })

  // Second pass: attach MCQ choices using peer words (definition → pick word)
  const byLevel = {
    Starters: draft.filter((item) => item.level === 'Starters'),
    Movers: draft.filter((item) => item.level === 'Movers'),
    Flyers: draft.filter((item) => item.level === 'Flyers'),
    Preliminary: draft.filter((item) => item.level === 'Preliminary'),
  }

  const vocabulary = draft.map((item) => {
    const pool = byLevel[item.level]
    const wrong = distractors(item.word, item.partOfSpeech, pool, item.answer)
    const choices = [...wrong, item.answer]
    // stable shuffle by id hash
    let hash = 0
    for (const ch of item.id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
    for (let i = choices.length - 1; i > 0; i -= 1) {
      const j = hash % (i + 1)
      hash = (hash * 2654435761) >>> 0
      ;[choices[i], choices[j]] = [choices[j], choices[i]]
    }
    return {
      id: item.id,
      word: item.word,
      phonetic: item.phonetic,
      definition: item.definition,
      definitionVi: item.definitionVi ?? '',
      sentence: item.sentence,
      category: item.category,
      partOfSpeech: item.partOfSpeech,
      choices,
      answer: item.answer,
      hint: item.hint,
      fact: item.fact,
      level: item.level,
    }
  })

  writeVocabularyByLevel(vocabulary, {
    yle: 'Cambridge Pre A1 Starters, A1 Movers and A2 Flyers Wordlists 2025',
    preliminary: 'Cambridge B1 Preliminary Vocabulary List August 2025',
    builtAt: new Date().toISOString(),
  })

  console.log(`Wrote ${vocabulary.length} words → server/data/{starters,movers,flyers,preliminary}.json`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
