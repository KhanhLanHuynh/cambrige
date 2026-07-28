/**
 * Fetch open-license illustrations for vocabulary words (all Cambridge levels).
 * Primary: Openverse API (illustrations preferred). Fallback: Wikipedia pageimages.
 * Saves WebP under public/assets/images/words/{id}.webp and sets word.image / imageCredit.
 *
 * Usage:
 *   node scripts/generate-word-images.mjs
 *   node scripts/generate-word-images.mjs --level=Starters
 *   node scripts/generate-word-images.mjs --limit=20
 *   node scripts/generate-word-images.mjs --force
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { LEVELS, loadAllVocabulary, writeVocabularyByLevel } from './vocab-files.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const IMAGES_DIR = resolve(ROOT, 'public/assets/images/words')
const ATTRIBUTION_PATH = resolve(ROOT, 'scripts/.image-attribution.json')
const MISSING_PATH = resolve(ROOT, 'scripts/.image-missing.json')
const USER_AGENT = 'CambridgeVocabQuest/1.0 (educational vocab images; open-license only)'
const PUBLIC_PATH_PREFIX = '/assets/images/words'
const TARGET_SIZE = 1024
const MIN_SOURCE_PX = 640
const RATE_MS = 400
const OPENVERSE_PAGE_SIZE = 20 // anonymous Openverse max; larger → 401
const MIN_SCORE = 12

/** Function / abstract lemmas that rarely have a clear kid-safe illustration. */
const SKIP_LEMMAS = new Set(
  [
    'a',
    'an',
    'the',
    'and',
    'or',
    'but',
    'if',
    'as',
    'at',
    'by',
    'for',
    'from',
    'in',
    'into',
    'of',
    'on',
    'to',
    'with',
    'without',
    'about',
    'after',
    'again',
    'also',
    'always',
    'because',
    'before',
    'both',
    'each',
    'either',
    'enough',
    'every',
    'how',
    'however',
    'just',
    'more',
    'most',
    'much',
    'never',
    'not',
    'now',
    'only',
    'other',
    'over',
    'same',
    'so',
    'some',
    'still',
    'than',
    'that',
    'then',
    'there',
    'these',
    'this',
    'those',
    'though',
    'too',
    'very',
    'what',
    'when',
    'where',
    'which',
    'while',
    'who',
    'why',
    'will',
    'would',
    'can',
    'could',
    'may',
    'might',
    'must',
    'shall',
    'should',
    'be',
    'am',
    'is',
    'are',
    'was',
    'were',
    'been',
    'being',
    'do',
    'does',
    'did',
    'done',
    'have',
    'has',
    'had',
    'say',
    'said',
    'tell',
    'told',
    'ask',
    'asked',
    'know',
    'knew',
    'known',
    'think',
    'thought',
    'want',
    'wanted',
    'need',
    'needed',
    'seem',
    'seemed',
    'become',
    'became',
    'please',
    'sorry',
    'hello',
    'goodbye',
    'yes',
    'no',
    'ok',
    'okay',
    'well',
    'really',
    'quite',
    'rather',
    'almost',
    'already',
    'yet',
    'even',
    'else',
    'own',
    'such',
    'once',
    'twice',
    'often',
    'sometimes',
    'usually',
    'actually',
    'especially',
    'probably',
    'perhaps',
  ].map((w) => w.toLowerCase()),
)

const KID_SAFE_TAGS = /\b(illustration|illustrations|clipart|clip-art|cartoon|cartoons|drawing|drawings|vector|icon|icons|sticker|kids?|children|child|school|coloring|colouring|simple)\b/i
const UNSAFE_TAGS =
  /\b(nude|nudity|nsfw|porn|pornography|erotic|erotica|sexy|lingerie|bikini|underwear|fetish|nsfl|gore|gory|violence|violent|weapon|gun|rifle|pistol|knife|blood|bloody|murder|corpse|funeral|horror|creepy|gothic|war|army|military|soldier|cigarette|smoking|alcohol|drunk|dating|selfie|tattoo)\b/i

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms))
}

function parseArgs(argv) {
  const args = { level: null, limit: null, force: false }
  for (const arg of argv) {
    if (arg === '--force') args.force = true
    else if (arg.startsWith('--level=')) args.level = arg.slice('--level='.length)
    else if (arg === '--level') args.level = null
    else if (arg.startsWith('--limit=')) args.limit = Number(arg.slice('--limit='.length))
  }
  const levelIdx = argv.indexOf('--level')
  if (levelIdx >= 0 && argv[levelIdx + 1] && !argv[levelIdx + 1].startsWith('--')) {
    args.level = argv[levelIdx + 1]
  }
  const limitIdx = argv.indexOf('--limit')
  if (limitIdx >= 0 && argv[limitIdx + 1] && !argv[limitIdx + 1].startsWith('--')) {
    args.limit = Number(argv[limitIdx + 1])
  }
  return args
}

function cleanDisplay(word) {
  return String(word)
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/[)\]}>]+$/g, '')
    .replace(/^[(\[{<]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function assetPath(id) {
  return resolve(IMAGES_DIR, `${id}.webp`)
}

function publicImageUrl(id) {
  return `${PUBLIC_PATH_PREFIX}/${id}.webp`
}

function loadJson(path, fallback) {
  if (!existsSync(path)) return fallback
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return fallback
  }
}

function saveJson(path, data) {
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`)
}

/** Persist only image fields so concurrent content regen is not overwritten. */
function saveImageFields(memoryWords, source = {}) {
  const byId = new Map(memoryWords.map((w) => [w.id, w]))
  const all = loadAllVocabulary()
  for (const word of all.words) {
    const mem = byId.get(word.id)
    if (!mem) continue
    if (mem.image) word.image = mem.image
    else delete word.image
    if (mem.imageCredit) word.imageCredit = mem.imageCredit
    else delete word.imageCredit
  }
  writeVocabularyByLevel(all.words, {
    ...all.source,
    ...source,
    imagesFetchedAt: new Date().toISOString(),
  })
}

function formatCredit({ creator, license, sourceUrl, provider }) {
  const parts = []
  if (creator) parts.push(creator)
  if (license) parts.push(license)
  if (provider) parts.push(provider)
  if (sourceUrl) parts.push(sourceUrl)
  return parts.join(' · ')
}

function lemmaTokens(lemma) {
  return lemma
    .toLowerCase()
    .split(/[\s/-]+/)
    .map((t) => t.replace(/[^a-z0-9']/g, ''))
    .filter((t) => t.length >= 2)
}

function titleContainsLemma(title, lemma) {
  const t = String(title || '').toLowerCase()
  const tokens = lemmaTokens(lemma)
  if (!t || tokens.length === 0) return false
  return tokens.every((token) => {
    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp(`\\b${escaped}\\b`, 'i').test(t) || t.includes(token)
  })
}

function looksUnsafe(title, tags = []) {
  const blob = `${title} ${(tags || []).join(' ')}`.toLowerCase()
  return UNSAFE_TAGS.test(blob)
}

function isConcreteWord(word, lemma) {
  const lower = lemma.toLowerCase()
  if (SKIP_LEMMAS.has(lower)) return false
  if (lemmaTokens(lemma).length === 0) return false
  // Multi-word phrases that start with function words are often example sentences, not lemmas
  if (/\s/.test(lemma) && lemma.split(/\s+/).length > 4) return false
  const pos = String(word.partOfSpeech || '').toLowerCase()
  if (pos === 'determiner' || pos === 'preposition' || pos === 'conjunction' || pos === 'pronoun') {
    return false
  }
  return true
}

function buildSearchQueries(word, lemma) {
  const category = String(word.category || '').trim()
  const queries = [`${lemma} illustration`, `${lemma} cartoon`, `${lemma} clipart`]
  if (category && category !== 'general' && !category.includes(lemma.toLowerCase())) {
    queries.push(`${lemma} ${category} illustration`)
  }
  queries.push(lemma)
  return [...new Set(queries)]
}

function scoreOpenverseItem(item, lemma) {
  const title = item.title || ''
  const tags = (item.tags || []).map((t) => t.name || t).filter(Boolean)
  const tagText = tags.join(' ')
  const hay = `${title} ${tagText} ${item.category || ''}`.toLowerCase()
  const imageUrl = item.url
  if (!imageUrl) return null
  if (looksUnsafe(title, tags)) return null

  const width = Number(item.width) || 0
  const height = Number(item.height) || 0
  const minDim = Math.min(width || MIN_SOURCE_PX, height || MIN_SOURCE_PX)
  if (width && height && minDim < MIN_SOURCE_PX) return null

  let score = 0
  const titleHit = titleContainsLemma(title, lemma)
  const tagHit = lemmaTokens(lemma).every((token) => new RegExp(`\\b${token}\\b`, 'i').test(tagText || hay))
  if (!titleHit && !tagHit) return null

  if (titleHit) score += 20
  if (tagHit) score += 10
  if (String(item.category || '').toLowerCase() === 'illustration') score += 25
  if (KID_SAFE_TAGS.test(hay)) score += 15
  if (/\b(photograph|photo|photography)\b/i.test(hay) || String(item.category || '') === 'photograph') {
    score -= 8
  }
  // Prefer larger sources
  if (minDim >= 1024) score += 8
  else if (minDim >= 800) score += 4
  // Slightly prefer square-ish crops for vocab cards
  if (width && height) {
    const ratio = width / height
    if (ratio >= 0.7 && ratio <= 1.4) score += 3
  }

  return {
    score,
    imageUrl,
    creator: item.creator || item.creator_name || 'Unknown',
    license: item.license
      ? `CC ${String(item.license).toUpperCase()}${item.license_version ? ` ${item.license_version}` : ''}`
      : 'CC',
    sourceUrl: item.foreign_landing_url || item.url,
    provider: item.provider || 'Openverse',
    width: width || undefined,
    height: height || undefined,
    category: item.category || undefined,
  }
}

function pickBestOpenverseHit(results, lemma) {
  let best = null
  for (const item of results) {
    const candidate = scoreOpenverseItem(item, lemma)
    if (!candidate) continue
    if (!best || candidate.score > best.score) best = candidate
  }
  if (!best || best.score < MIN_SCORE) return null
  const { score: _score, width: _w, height: _h, category: _c, ...hit } = best
  return hit
}

async function fetchJson(url, attempt = 1) {
  const response = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
  })
  if (response.status === 429 || response.status >= 500) {
    if (attempt < 5) {
      await sleep(600 * attempt)
      return fetchJson(url, attempt + 1)
    }
  }
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`)
  return response.json()
}

async function searchOpenverseOnce(query, { category, size } = {}) {
  const params = new URLSearchParams({
    q: query,
    page_size: String(OPENVERSE_PAGE_SIZE),
    mature: 'false',
    license_type: 'commercial,modification',
    filter_dead: 'true',
  })
  if (category) params.set('category', category)
  if (size) params.set('size', size)
  const url = `https://api.openverse.org/v1/images/?${params}`
  const data = await fetchJson(url)
  return Array.isArray(data?.results) ? data.results : []
}

async function searchOpenverse(word, lemma) {
  const queries = buildSearchQueries(word, lemma)
  // Cascading filters: kid-friendly illustrations first, then broader search.
  const attempts = [
    { category: 'illustration', size: 'large' },
    { category: 'illustration', size: 'medium' },
    { category: 'illustration' },
    { size: 'large' },
    {},
  ]

  try {
    // Prefer first query with all filters, then try alternate phrasings with illustration+large only.
    for (let qi = 0; qi < queries.length; qi += 1) {
      const query = queries[qi]
      const filters = qi === 0 ? attempts : [{ category: 'illustration', size: 'large' }, { category: 'illustration' }]
      for (const attempt of filters) {
        await sleep(RATE_MS)
        const results = await searchOpenverseOnce(query, attempt)
        const hit = pickBestOpenverseHit(results, lemma)
        if (hit) return hit
      }
    }
  } catch (error) {
    console.warn(`  Openverse miss for "${lemma}": ${error.message}`)
  }
  return null
}

async function searchWikipedia(lemma) {
  const title = lemma.charAt(0).toUpperCase() + lemma.slice(1)
  const params = new URLSearchParams({
    action: 'query',
    titles: title,
    prop: 'pageimages',
    format: 'json',
    piprop: 'thumbnail|original',
    pithumbsize: String(TARGET_SIZE),
    redirects: '1',
    origin: '*',
  })
  const url = `https://en.wikipedia.org/w/api.php?${params}`
  try {
    const data = await fetchJson(url)
    const pages = data?.query?.pages || {}
    for (const page of Object.values(pages)) {
      if (!page || page.missing != null) continue
      if (!titleContainsLemma(page.title || '', lemma) && page.title?.toLowerCase() !== lemma.toLowerCase()) {
        continue
      }
      if (looksUnsafe(page.title || lemma)) continue
      const original = page.original?.source
      const thumb = page.thumbnail?.source
      const imageUrl = original || thumb
      if (!imageUrl) continue
      const ow = Number(page.original?.width) || 0
      const oh = Number(page.original?.height) || 0
      if (ow && oh && Math.min(ow, oh) < MIN_SOURCE_PX) continue
      return {
        imageUrl,
        creator: 'Wikipedia / Wikimedia contributors',
        license: 'See source page (often CC BY-SA)',
        sourceUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}`,
        provider: 'Wikipedia',
      }
    }
  } catch (error) {
    console.warn(`  Wikipedia miss for "${lemma}": ${error.message}`)
  }
  return null
}

async function downloadAndWriteWebp(imageUrl, destPath) {
  const response = await fetch(imageUrl, {
    headers: { 'User-Agent': USER_AGENT },
    redirect: 'follow',
  })
  if (!response.ok) throw new Error(`Download HTTP ${response.status}`)
  const buffer = Buffer.from(await response.arrayBuffer())
  const meta = await sharp(buffer).metadata()
  const minDim = Math.min(meta.width || 0, meta.height || 0)
  if (minDim > 0 && minDim < MIN_SOURCE_PX) {
    throw new Error(`source too small (${meta.width}x${meta.height})`)
  }
  await sharp(buffer)
    .rotate()
    .resize(TARGET_SIZE, TARGET_SIZE, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      withoutEnlargement: false,
    })
    .webp({ quality: 88 })
    .toFile(destPath)
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.level && !LEVELS.includes(args.level)) {
    throw new Error(`Unknown level: ${args.level}. Expected one of ${LEVELS.join(', ')}`)
  }
  if (args.limit != null && (!Number.isFinite(args.limit) || args.limit < 1)) {
    throw new Error('--limit must be a positive number')
  }

  mkdirSync(IMAGES_DIR, { recursive: true })

  const data = loadAllVocabulary()
  const attribution = loadJson(ATTRIBUTION_PATH, {})
  const missing = loadJson(MISSING_PATH, [])
  const missingSet = new Set(missing)

  let candidates = data.words.filter((word) => {
    if (args.level && word.level !== args.level) return false
    const dest = assetPath(word.id)
    const hasFile = existsSync(dest)
    const hasField = Boolean(word.image?.trim())
    if (!args.force && hasFile && hasField) return false
    return true
  })

  if (args.limit) candidates = candidates.slice(0, args.limit)

  console.log(
    `Fetching images for ${candidates.length} words` +
      `${args.level ? ` (${args.level})` : ' (all levels)'}` +
      `${args.force ? ' [force]' : ''}…` +
      ` (target ${TARGET_SIZE}px, min source ${MIN_SOURCE_PX}px)`,
  )

  let fetched = 0
  let skipped = 0
  let failed = 0
  let lastSaveAt = Date.now()

  for (let index = 0; index < candidates.length; index += 1) {
    const word = candidates[index]
    const lemma = cleanDisplay(word.word)
    const dest = assetPath(word.id)
    process.stdout.write(`[${index + 1}/${candidates.length}] ${word.id} (${lemma})… `)

    try {
      if (!args.force && existsSync(dest) && word.image) {
        skipped += 1
        console.log('skip')
        continue
      }

      if (!isConcreteWord(word, lemma)) {
        failed += 1
        missingSet.add(word.id)
        delete word.image
        delete word.imageCredit
        delete attribution[word.id]
        console.log('skip-abstract')
        continue
      }

      let hit = await searchOpenverse(word, lemma)
      if (!hit) {
        await sleep(RATE_MS)
        hit = await searchWikipedia(lemma)
      }

      if (!hit) {
        failed += 1
        missingSet.add(word.id)
        delete word.image
        delete word.imageCredit
        console.log('missing')
        continue
      }

      await downloadAndWriteWebp(hit.imageUrl, dest)
      const credit = formatCredit(hit)
      word.image = publicImageUrl(word.id)
      word.imageCredit = credit
      attribution[word.id] = {
        word: word.word,
        level: word.level,
        image: word.image,
        ...hit,
        fetchedAt: new Date().toISOString(),
      }
      missingSet.delete(word.id)
      fetched += 1
      console.log(`ok (${hit.provider})`)
    } catch (error) {
      failed += 1
      missingSet.add(word.id)
      console.log(`error: ${error.message}`)
    }

    if (Date.now() - lastSaveAt > 15_000 || index === candidates.length - 1) {
      writeVocabularyByLevel(data.words, {
        ...data.source,
        imagesFetchedAt: new Date().toISOString(),
      })
      saveJson(ATTRIBUTION_PATH, attribution)
      saveJson(MISSING_PATH, [...missingSet].sort())
      lastSaveAt = Date.now()
    }
  }

  writeVocabularyByLevel(data.words, {
    ...data.source,
    imagesFetchedAt: new Date().toISOString(),
  })
  saveJson(ATTRIBUTION_PATH, attribution)
  saveJson(MISSING_PATH, [...missingSet].sort())

  console.log(`Done. fetched=${fetched} skipped=${skipped} missing/failed=${failed}`)
  console.log(`Attribution: ${ATTRIBUTION_PATH}`)
  console.log(`Missing list: ${MISSING_PATH}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
