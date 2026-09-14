/**
 * Fix frankenstein vocab IDs where the id lemma does not match `word`.
 *
 * - Rename valid entries to the correct slug
 * - Delete bogus / duplicate entries
 * - Sync content packs, gloss packs, image attribution, and image files
 *
 * Run: node scripts/fix-frankenstein-vocab-ids.mjs
 */
import { readFileSync, writeFileSync, existsSync, renameSync, unlinkSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** @type {Record<string, { action: 'rename' | 'delete', to?: string, patch?: Record<string, unknown> }>} */
const FIXES = {
  'starters-pl': {
    action: 'rename',
    to: 'starters-please',
  },
  'starters-adj': {
    // Parse artifact (POS tag as id); "and" is not a content quiz lemma.
    action: 'delete',
  },
  'movers-ability': {
    // Not a Movers headword; "count" already exists as starters-count.
    action: 'delete',
  },
  'flyers-ibility': {
    action: 'rename',
    to: 'flyers-could',
  },
  'flyers-bike': {
    action: 'rename',
    to: 'flyers-racing',
  },
  'preliminary-charges': {
    action: 'rename',
    to: 'preliminary-admit',
    patch: {
      hint: 'If you break a rule, you should admit it.',
      fact: 'Admit can also mean to let someone into a place, like a museum.',
    },
  },
  'preliminary-it-s-stopped-raining': {
    // Duplicate of preliminary-stop (example sentence used as id).
    action: 'delete',
  },
}

const LEVEL_FILES = {
  Starters: resolve(root, 'server/data/starters.json'),
  Movers: resolve(root, 'server/data/movers.json'),
  Flyers: resolve(root, 'server/data/flyers.json'),
  Preliminary: resolve(root, 'server/data/preliminary.json'),
}

const PACK_FILES = [
  resolve(root, 'scripts/starters-content-pack.json'),
  resolve(root, 'scripts/movers-content-pack.json'),
  resolve(root, 'scripts/flyers-content-pack.json'),
  resolve(root, 'scripts/preliminary-content-pack.json'),
  resolve(root, 'scripts/packs/starters-glosses-af.json'),
  resolve(root, 'scripts/packs/starters-glosses-nz.json'),
  resolve(root, 'scripts/packs/movers-glosses-af.json'),
  resolve(root, 'scripts/packs/flyers-glosses-af.json'),
  resolve(root, 'scripts/packs/flyers-glosses-nz.json'),
]

const ATTR_FILE = resolve(root, 'scripts/.image-attribution.json')
const MISSING_FILE = resolve(root, 'scripts/.image-missing.json')
const GLOSS_DATA = resolve(root, 'scripts/packs/flyers-gloss-data.mjs')
const IMAGE_DIR = resolve(root, 'public/assets/images/words')

function loadJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function saveJson(path, data) {
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`)
}

function rewriteKeyedJson(path) {
  if (!existsSync(path)) return { renamed: 0, deleted: 0 }
  const data = loadJson(path)
  let renamed = 0
  let deleted = 0
  for (const [from, fix] of Object.entries(FIXES)) {
    if (!(from in data)) continue
    if (fix.action === 'delete') {
      delete data[from]
      deleted += 1
      continue
    }
    const to = fix.to
    const entry = { ...data[from], ...(fix.patch || {}) }
    delete data[from]
    data[to] = entry
    renamed += 1
  }
  saveJson(path, data)
  return { renamed, deleted }
}

function fixLevelFile(path) {
  const data = loadJson(path)
  const before = data.words.length
  const next = []
  for (const word of data.words) {
    const fix = FIXES[word.id]
    if (!fix) {
      next.push(word)
      continue
    }
    if (fix.action === 'delete') continue
    const renamed = {
      ...word,
      id: fix.to,
      ...(fix.patch || {}),
    }
    if (renamed.image) {
      renamed.image = renamed.image.replace(word.id, fix.to)
    }
    next.push(renamed)
  }
  data.words = next
  data.count = next.length
  data.source = {
    ...data.source,
    frankensteinIdsFixedAt: new Date().toISOString().slice(0, 10),
  }
  saveJson(path, data)
  return { before, after: next.length, removed: before - next.length }
}

function renameImage(fromId, toId) {
  const from = resolve(IMAGE_DIR, `${fromId}.webp`)
  const to = resolve(IMAGE_DIR, `${toId}.webp`)
  if (!existsSync(from)) return 'missing'
  if (existsSync(to)) {
    unlinkSync(from)
    return 'dest-exists-removed-src'
  }
  renameSync(from, to)
  return 'renamed'
}

function deleteImage(id) {
  const file = resolve(IMAGE_DIR, `${id}.webp`)
  if (!existsSync(file)) return 'missing'
  unlinkSync(file)
  return 'deleted'
}

function fixAttribution() {
  if (!existsSync(ATTR_FILE)) return
  const data = loadJson(ATTR_FILE)
  for (const [from, fix] of Object.entries(FIXES)) {
    if (!(from in data)) continue
    if (fix.action === 'delete') {
      delete data[from]
      continue
    }
    const entry = { ...data[from] }
    entry.image = `/assets/images/words/${fix.to}.webp`
    if (typeof entry.word === 'string') {
      // Keep display word if already corrected; otherwise leave as-is.
    }
    delete data[from]
    data[fix.to] = entry
  }
  saveJson(ATTR_FILE, data)
}

function fixMissingList() {
  if (!existsSync(MISSING_FILE)) return
  const list = loadJson(MISSING_FILE)
  if (!Array.isArray(list)) return
  const next = []
  for (const id of list) {
    const fix = FIXES[id]
    if (!fix) {
      next.push(id)
      continue
    }
    if (fix.action === 'delete') continue
    next.push(fix.to)
  }
  saveJson(MISSING_FILE, [...new Set(next)].sort())
}

function fixFlyersGlossData() {
  if (!existsSync(GLOSS_DATA)) return
  let text = readFileSync(GLOSS_DATA, 'utf8')
  for (const [from, fix] of Object.entries(FIXES)) {
    if (fix.action === 'delete') {
      // Remove object entry "from": { ... },
      const re = new RegExp(`\\n\\s*"${from}":\\s*\\{[\\s\\S]*?\\n\\s*\\},?`, 'm')
      text = text.replace(re, '\n')
      continue
    }
    text = text.replaceAll(`"${from}"`, `"${fix.to}"`)
  }
  // Clean HEAD_OVERRIDES leftovers for fixed lemmas (optional clarity)
  text = text.replace(/\n\s*'ibility\)':\s*'could',/, '')
  text = text.replace(/\n\s*'bike\)':\s*'racing',/, '')
  writeFileSync(GLOSS_DATA, text)
}

function main() {
  console.log('Fixing level JSON…')
  for (const [level, path] of Object.entries(LEVEL_FILES)) {
    const result = fixLevelFile(path)
    console.log(`  ${level}: ${result.before} → ${result.after} (removed ${result.removed})`)
  }

  console.log('Fixing keyed packs…')
  for (const path of PACK_FILES) {
    const result = rewriteKeyedJson(path)
    console.log(`  ${path.split(/[/\\]/).slice(-2).join('/')}: rename=${result.renamed} delete=${result.deleted}`)
  }

  console.log('Fixing image attribution / missing list…')
  fixAttribution()
  fixMissingList()
  fixFlyersGlossData()

  console.log('Renaming/deleting image files…')
  for (const [from, fix] of Object.entries(FIXES)) {
    if (fix.action === 'delete') {
      console.log(`  ${from}: ${deleteImage(from)}`)
    } else {
      console.log(`  ${from} → ${fix.to}: ${renameImage(from, fix.to)}`)
    }
  }

  console.log('Done.')
}

main()
