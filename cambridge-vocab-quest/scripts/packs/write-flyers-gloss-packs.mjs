/**
 * Write flyers-glosses-af.json, flyers-glosses-gm.json, flyers-glosses-nz.json
 * from flyers-gloss-data.mjs + server/data/flyers.json.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { bucketFor, getFlyersGloss } from './flyers-gloss-data.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const data = JSON.parse(readFileSync(resolve(here, '../../server/data/flyers.json'), 'utf8'))

const packs = { af: {}, gm: {}, nz: {} }

for (const word of data.words) {
  const bucket = bucketFor(word.word)
  const gloss = getFlyersGloss(word.id, word.word, word.partOfSpeech)
  packs[bucket][word.id] = {
    category: gloss.category,
    definition: gloss.definition,
    definitionVi: gloss.definitionVi,
    hint: gloss.hint,
    fact: gloss.fact,
  }
}

for (const key of ['af', 'gm', 'nz']) {
  const outPath = resolve(here, `flyers-glosses-${key}.json`)
  writeFileSync(outPath, `${JSON.stringify(packs[key], null, 2)}\n`)
  console.log(`Wrote ${Object.keys(packs[key]).length} entries → ${outPath}`)
}

const allIds = new Set(data.words.map((w) => w.id))
const written = new Set([...Object.keys(packs.af), ...Object.keys(packs.gm), ...Object.keys(packs.nz)])
const missing = [...allIds].filter((id) => !written.has(id))
const extra = [...written].filter((id) => !allIds.has(id))
if (missing.length || extra.length) {
  console.error('Coverage error:', { missing: missing.length, extra: extra.length })
  process.exit(1)
}
console.log('Coverage OK:', written.size, 'entries across 3 files')
