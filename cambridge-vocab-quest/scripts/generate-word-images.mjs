/**
 * Fetch open-license illustrations for vocabulary words (all Cambridge levels).
 * Primary: Openverse API. Fallback: Wikipedia pageimages / Wikimedia.
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
const TARGET_SIZE = 512
const RATE_MS = 350

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms))
}

function parseArgs(argv) {
  const args = { level: null, limit: null, force: false }
  for (const arg of argv) {
    if (arg === '--force') args.force = true
    else if (arg.startsWith('--level=')) args.level = arg.slice('--level='.length)
    else if (arg === '--level') args.level = null // filled by next token handler below
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

function formatCredit({ creator, license, sourceUrl, provider }) {
  const parts = []
  if (creator) parts.push(creator)
  if (license) parts.push(license)
  if (provider) parts.push(provider)
  if (sourceUrl) parts.push(sourceUrl)
  return parts.join(' · ')
}

function titleLooksRelevant(title, lemma) {
  const t = String(title || '').toLowerCase()
  const w = lemma.toLowerCase()
  if (!t || !w) return true
  if (t.includes(w)) return true
  // Allow short lemmas that appear as whole words
  const escaped = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`\\b${escaped}\\b`, 'i').test(t)
}

function looksUnsafe(title, tags = []) {
  const blob = `${title} ${(tags || []).join(' ')}`.toLowerCase()
  return /\b(nude|nsfw|porn|erotic|sex|gore|violence|weapon|gun|blood)\b/.test(blob)
}

async function fetchJson(url, attempt = 1) {
  const response = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
  })
  if (response.status === 429 || response.status >= 500) {
    if (attempt < 5) {
      await sleep(500 * attempt)
      return fetchJson(url, attempt + 1)
    }
  }
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`)
  return response.json()
}

async function pickOpenverseHit(results, lemma) {
  let fallback = null
  for (const item of results) {
    const title = item.title || ''
    const tags = (item.tags || []).map((t) => t.name || t).filter(Boolean)
    if (looksUnsafe(title, tags)) continue
    const imageUrl = item.url || item.thumbnail
    if (!imageUrl) continue
    const candidate = {
      imageUrl,
      creator: item.creator || item.creator_name || 'Unknown',
      license: item.license ? `CC ${String(item.license).toUpperCase()}${item.license_version ? ` ${item.license_version}` : ''}` : 'CC',
      sourceUrl: item.foreign_landing_url || item.url,
      provider: item.provider || 'Openverse',
    }
    const hay = `${title} ${item.id || ''} ${item.url || ''} ${item.foreign_landing_url || ''}`.toLowerCase()
    const matched = titleLooksRelevant(title, lemma) || hay.includes(lemma.toLowerCase())
    if (matched) return candidate
    if (!fallback) fallback = candidate
  }
  return fallback
}

async function searchOpenverse(lemma) {
  const params = new URLSearchParams({
    q: lemma,
    page_size: '8',
    mature: 'false',
    license_type: 'commercial,modification',
  })
  const url = `https://api.openverse.org/v1/images/?${params}`
  try {
    const data = await fetchJson(url)
    const results = Array.isArray(data?.results) ? data.results : []
    return pickOpenverseHit(results, lemma)
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
      const thumb = page.thumbnail?.source
      const original = page.original?.source
      const imageUrl = original || thumb
      if (!imageUrl) continue
      if (looksUnsafe(page.title || lemma)) continue
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
  await sharp(buffer)
    .rotate()
    .resize(TARGET_SIZE, TARGET_SIZE, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .webp({ quality: 82 })
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
      `${args.force ? ' [force]' : ''}…`,
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

      await sleep(RATE_MS)
      let hit = await searchOpenverse(lemma)
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
