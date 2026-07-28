/**
 * Quality gates for YLE / Preliminary regenerated educational content.
 *
 * Usage:
 *   node scripts/verify-yle-content.mjs
 *   node scripts/verify-yle-content.mjs --level Movers
 *   node scripts/verify-yle-content.mjs --level all
 */
import { readFileSync } from 'node:fs'
import { LEVELS, levelFilePath } from './vocab-files.mjs'
import {
  ALLOWED_CATEGORIES,
  categoryFor,
  cleanDisplay,
  sentenceContainsLemma,
} from './yle-content-templates.mjs'

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

const FOOD = /^(apple|banana|bean|beans|biscuit|bread|burger|cake|candy|carrot|cereal|cheese|chicken|chips|chocolate|coconut|cookie|dessert|egg|fish|food|fries|fruit|grape|herb|honey|ice cream|jam|juice|kiwi|lemon|lemonade|lime|mango|meat|meatballs|melon|milk|milkshake|mushroom|noodles|olive|olives|onion|orange|pancake|pasta|peach|peanut|pear|pepper|pizza|potato|rice|salad|salt|sandwich|sauce|sausage|soup|spinach|strawberry|sugar|supper|toast|tomato|vanilla|water|watermelon|yoghurt|yogurt|chilli|chili|cabbage|lettuce|coffee|tea|breakfast|lunch|dinner|meal|snack|drink|vegetable|sweet|sweets|pie|pineapple|pea)$/i
const CLOTHES = /^(shirt|dress|hat|shoe|shoes|jacket|jeans|boot|boots|sock|socks|coat|scarf|gloves|trousers|skirt|sweater|sweatshirt|jumper|tie|belt|cap|helmet|uniform|pyjamas|shorts|t-shirt|pants|suit|sleeve|clothing|clothes|sandal|sandals|tights|baseball cap)$/i

function verifyLevel(level) {
  const data = JSON.parse(readFileSync(levelFilePath(level), 'utf8'))
  const issues = []
  const maxDefLen = level === 'Preliminary' ? 160 : 120

  for (const word of data.words) {
    const id = word.id
    const head = cleanDisplay(word.word).toLowerCase()
    const corruptLemma = head.length > 48 || head.split(/\s+/).length > 6

    if (!word.definition?.trim()) issues.push(`${id}: empty definition`)
    if (/Malus|domestica|taxonomy|possessing beauty|act or instance of/i.test(word.definition || '')) {
      issues.push(`${id}: dictionary-style definition`)
    }
    if ((word.definition || '').length > maxDefLen) issues.push(`${id}: definition too long`)

    if (!word.definitionVi?.trim()) issues.push(`${id}: empty definitionVi`)
    if (/Một hành động hoặc trường hợp/i.test(word.definitionVi || '')) {
      issues.push(`${id}: literal Vietnamese calque`)
    }

    if (!word.hint?.trim()) issues.push(`${id}: empty hint`)
    if (/^Think about what |^Try using [“"]to |^It describes how something is\.?$/i.test(word.hint || '')) {
      issues.push(`${id}: generic hint`)
    }

    if (!word.fact?.trim()) issues.push(`${id}: empty fact`)
    if (/\bmeans\b/i.test(word.fact || '') && /is a word for/i.test(word.fact || '')) {
      issues.push(`${id}: weak fact`)
    }

    if (!ALLOWED_CATEGORIES.has(word.category)) {
      issues.push(`${id}: invalid category ${word.category}`)
    }
    const expected = categoryFor(word.word, '')
    if (!corruptLemma && expected && expected !== 'general' && word.category === 'general') {
      issues.push(`${id}: category should be ${expected}, got general`)
    }

    const sentences = word.sentences || []
    if (sentences.length !== 10) issues.push(`${id}: expected 10 sentences, got ${sentences.length}`)
    if (!sentences[0]?.trim()) issues.push(`${id}: missing primary sentence`)
    for (const s of sentences) {
      if (!corruptLemma && !sentenceContainsLemma(s, word.word)) {
        issues.push(`${id}: sentence missing lemma: ${s}`)
      }
      if (/I like to .+ with my friends/i.test(s)) {
        issues.push(`${id}: nonsense template: ${s}`)
      }
      if (/Open your armchair|Touch your armchair and smile/i.test(s)) {
        issues.push(`${id}: bad armchair sentence: ${s}`)
      }
      if (/ate .+ for lunch/i.test(s) && !FOOD.test(head) && word.category !== 'food') {
        issues.push(`${id}: food mismatch: ${s}`)
      }
      if (
        /put on /i.test(s)
        && !CLOTHES.test(head)
        && word.category !== 'clothes'
        && head !== 'wear'
        && head !== 'put'
        && !/put on/.test(head)
      ) {
        issues.push(`${id}: clothes mismatch: ${s}`)
      }
    }
  }

  console.log(`Checked ${data.words.length} ${level} words. Issues: ${issues.length}`)
  for (const line of issues.slice(0, 30)) console.log(`  - ${line}`)
  if (issues.length > 30) console.log(`  … and ${issues.length - 30} more`)
  return issues.length
}

function main() {
  const levels = resolveLevels(argValue('--level', 'Starters'))
  let total = 0
  for (const level of levels) total += verifyLevel(level)
  if (total) process.exitCode = 1
  else console.log('All checks passed.')
}

main()
