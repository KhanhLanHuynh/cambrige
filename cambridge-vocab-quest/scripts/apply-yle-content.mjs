/**
 * Apply YLE teacher-designed content pack to vocabulary JSON.
 * No external LLM APIs.
 *
 * Usage:
 *   node scripts/apply-yle-content.mjs
 *   node scripts/apply-yle-content.mjs --level Movers
 *   node scripts/apply-yle-content.mjs --level all
 *   node scripts/apply-yle-content.mjs --level all --no-rebuild-choices
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { ALLOWED_CATEGORIES } from './yle-content-templates.mjs'
import { LEVELS, levelFilePath } from './vocab-files.mjs'
import { packPathFor } from './build-yle-content-pack.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function argValue(flag, fallback = '') {
  const i = process.argv.indexOf(flag)
  if (i === -1) return fallback
  return process.argv[i + 1] || fallback
}

function hasFlag(flag) {
  return process.argv.includes(flag)
}

function resolveLevels(raw) {
  const value = String(raw || 'Starters').trim()
  if (/^all$/i.test(value)) return [...LEVELS]
  const match = LEVELS.find((l) => l.toLowerCase() === value.toLowerCase())
  if (!match) throw new Error(`Unknown level “${raw}”. Use: ${LEVELS.join(', ')}, or all`)
  return [match]
}

function applyLevel(level) {
  const packFile = packPathFor(level)
  if (!existsSync(packFile)) {
    throw new Error(`Missing content pack for ${level}: ${packFile}\nRun: node scripts/build-yle-content-pack.mjs --level ${level}`)
  }
  const pack = JSON.parse(readFileSync(packFile, 'utf8'))
  const filePath = levelFilePath(level)
  const data = JSON.parse(readFileSync(filePath, 'utf8'))

  let updated = 0
  let missing = 0
  for (const word of data.words) {
    const entry = pack[word.id]
    if (!entry) {
      missing += 1
      continue
    }
    if (entry.category && ALLOWED_CATEGORIES.has(entry.category)) {
      word.category = entry.category
    }
    if (entry.definition?.trim()) word.definition = entry.definition.trim()
    if (typeof entry.definitionVi === 'string') word.definitionVi = entry.definitionVi.trim()
    if (entry.hint?.trim()) word.hint = entry.hint.trim()
    if (entry.fact?.trim()) word.fact = entry.fact.trim()
    if (Array.isArray(entry.sentences) && entry.sentences.length) {
      word.sentences = entry.sentences.map((s) => String(s).trim()).filter(Boolean)
    }
    word.answer = word.word
    updated += 1
  }

  data.source = {
    ...data.source,
    contentRegeneratedAt: new Date().toISOString(),
    contentPack: `${level.toLowerCase()}-content-pack`,
  }
  data.count = data.words.length

  writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`)
  console.log(`Applied content to ${updated} ${level} words (${missing} missing from pack).`)
  return { updated, missing }
}

function main() {
  const levels = resolveLevels(argValue('--level', 'Starters'))
  const rebuildChoices = hasFlag('--rebuild-choices') || !hasFlag('--no-rebuild-choices')

  for (const level of levels) applyLevel(level)

  if (rebuildChoices) {
    const result = spawnSync(process.execPath, [resolve(root, 'scripts/rebuild-quiz-choices.mjs')], {
      cwd: root,
      stdio: 'inherit',
    })
    if (result.status !== 0) process.exit(result.status || 1)
  }
}

main()
