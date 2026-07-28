/**
 * Shim: build Starters content pack (delegates to build-yle-content-pack.mjs).
 * Prefer: node scripts/build-yle-content-pack.mjs --level Starters
 */
import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const result = spawnSync(
  process.execPath,
  [resolve(root, 'scripts/build-yle-content-pack.mjs'), '--level', 'Starters'],
  { cwd: root, stdio: 'inherit' },
)
process.exit(result.status || 0)
