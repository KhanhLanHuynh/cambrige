/**
 * Build per-level YLE/PET content packs from gloss packs + teacher templates.
 * No external LLM APIs.
 *
 * Usage:
 *   node scripts/build-yle-content-pack.mjs
 *   node scripts/build-yle-content-pack.mjs --level Movers
 *   node scripts/build-yle-content-pack.mjs --level all
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  ALLOWED_CATEGORIES,
  categoryFor,
  cleanDisplay,
  fallbackDefinition,
  fallbackDefinitionVi,
  fallbackFact,
  fallbackHint,
  generateSentences,
  sentenceContainsLemma,
} from './yle-content-templates.mjs'
import { LEVELS, levelFilePath } from './vocab-files.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const packsDir = resolve(root, 'scripts/packs')

export function levelSlug(level) {
  return String(level).toLowerCase()
}

export function packPathFor(level) {
  return resolve(root, 'scripts', `${levelSlug(level)}-content-pack.json`)
}

function argValue(flag, fallback = '') {
  const i = process.argv.indexOf(flag)
  if (i === -1) return fallback
  return process.argv[i + 1] || fallback
}

function resolveLevels(raw) {
  const value = String(raw || 'Starters').trim()
  if (/^all$/i.test(value)) return [...LEVELS]
  const match = LEVELS.find((l) => l.toLowerCase() === value.toLowerCase())
  if (!match) throw new Error(`Unknown level “${raw}”. Use: ${LEVELS.join(', ')}, or all`)
  return [match]
}

function loadGlosses(level) {
  const slug = levelSlug(level)
  const merged = {}
  if (!existsSync(packsDir)) return merged
  const files = readdirSync(packsDir)
    .filter((name) => name.startsWith(`${slug}-glosses`) && name.endsWith('.json'))
    .sort()
  for (const name of files) {
    Object.assign(merged, JSON.parse(readFileSync(resolve(packsDir, name), 'utf8')))
  }
  return merged
}

function ensureSentencesHaveLemma(word, sentences, level) {
  const ok = sentences.filter((s) => sentenceContainsLemma(s, word))
  if (ok.length >= 10) return ok.slice(0, 10)
  const w = cleanDisplay(word) || String(word || '').trim()
  if (!w) return ok.slice(0, 10)
  const label = `${w.charAt(0).toUpperCase()}${w.slice(1)}`
  const schoolish = level === 'Preliminary' || level === 'Flyers'
  const fillers = schoolish
    ? [
        `We practise the word “${w}” in class.`,
        `Can you use “${w}” in a sentence?`,
        `I wrote “${w}” in my notebook.`,
        `Look — here is “${w}”.`,
        `Please explain “${w}”.`,
        `My new word today is “${w}”.`,
        `${label} is a useful English word.`,
        `Say “${w}” with me.`,
        `I can spell “${w}”.`,
        `Do you know the word “${w}”?`,
      ]
    : [
        `We learn the word “${w}” in class.`,
        `Can you say “${w}”?`,
        `I write “${w}” in my book.`,
        `Look — here is “${w}”.`,
        `Please point to “${w}”.`,
        `My favourite word today is “${w}”.`,
        `${label} is a useful English word.`,
        `Say “${w}” with me.`,
        `I can spell “${w}”.`,
        `Do you know “${w}”?`,
      ]
  const seen = new Set(ok.map((s) => s.toLowerCase()))
  for (const f of fillers) {
    if (ok.length >= 10) break
    if (seen.has(f.toLowerCase())) continue
    if (!sentenceContainsLemma(f, word)) continue
    seen.add(f.toLowerCase())
    ok.push(f)
  }
  return ok.slice(0, 10)
}

export function buildPackForLevel(level) {
  const glosses = loadGlosses(level)
  const data = JSON.parse(readFileSync(levelFilePath(level), 'utf8'))
  const pack = {}
  let fromGloss = 0
  let fallback = 0

  for (const word of data.words) {
    const gloss = glosses[word.id] || {}
    const mapped = categoryFor(word.word, 'general')
    let category = ALLOWED_CATEGORIES.has(gloss.category) ? gloss.category : mapped
    if (category === 'general' && mapped !== 'general') category = mapped

    const definition = (gloss.definition || '').trim()
      || fallbackDefinition(word.word, word.partOfSpeech, category, level)
    const definitionVi = (gloss.definitionVi || '').trim()
      || fallbackDefinitionVi(word.word, word.partOfSpeech, category, level)
    const hint = (gloss.hint || '').trim()
      || fallbackHint(word.word, word.partOfSpeech, category, level)
    const fact = (gloss.fact || '').trim()
      || fallbackFact(word.word, category, level)

    let sentences = Array.isArray(gloss.sentences) && gloss.sentences.length >= 10
      ? gloss.sentences.map((s) => String(s).trim()).filter(Boolean).slice(0, 10)
      : generateSentences(word.word, word.partOfSpeech, category, level)
    sentences = ensureSentencesHaveLemma(word.word, sentences, level)

    if (glosses[word.id]) fromGloss += 1
    else fallback += 1

    pack[word.id] = {
      category,
      definition,
      definitionVi,
      hint,
      fact,
      sentences,
    }
  }

  const outPath = packPathFor(level)
  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, `${JSON.stringify(pack, null, 2)}\n`)
  console.log(`Wrote ${Object.keys(pack).length} ${level} entries → ${outPath}`)
  console.log(`  gloss hits: ${fromGloss}; template-only: ${fallback}`)
  return { level, count: Object.keys(pack).length, fromGloss, fallback, outPath }
}

function main() {
  const levels = resolveLevels(argValue('--level', 'Starters'))
  for (const level of levels) buildPackForLevel(level)
}

const isDirectRun = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isDirectRun) main()
