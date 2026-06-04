// Merge src/messages/_fragments/*.json into src/messages/{it,en}.json.
// Each fragment: { namespace, it: { "dotted.key": "...", ... }, en: {...} }.
// Dotted keys are unflattened into nested objects (next-intl nested lookup).
// Existing namespaces (landing, footer, common, consent) are preserved.
import { readFileSync, writeFileSync, readdirSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const msgDir = join(root, 'src', 'messages')
const fragDir = join(msgDir, '_fragments')

function unflatten(flat) {
  const out = {}
  for (const [k, v] of Object.entries(flat)) {
    const parts = k.split('.')
    let node = out
    for (let i = 0; i < parts.length - 1; i++) {
      if (typeof node[parts[i]] !== 'object' || node[parts[i]] === null) node[parts[i]] = {}
      node = node[parts[i]]
    }
    node[parts[parts.length - 1]] = v
  }
  return out
}

const it = JSON.parse(readFileSync(join(msgDir, 'it.json'), 'utf8'))
const en = JSON.parse(readFileSync(join(msgDir, 'en.json'), 'utf8'))

const frags = readdirSync(fragDir).filter((f) => f.endsWith('.json'))
let nsCount = 0
let keyCount = 0
for (const f of frags) {
  const frag = JSON.parse(readFileSync(join(fragDir, f), 'utf8'))
  const ns = frag.namespace
  if (!ns) {
    console.warn(`[merge] ${f}: missing namespace, skipped`)
    continue
  }
  it[ns] = { ...(it[ns] ?? {}), ...unflatten(frag.it ?? {}) }
  en[ns] = { ...(en[ns] ?? {}), ...unflatten(frag.en ?? {}) }
  nsCount++
  keyCount += Object.keys(frag.it ?? {}).length
  // Sanity: it/en key parity
  const itKeys = Object.keys(frag.it ?? {}).sort().join(',')
  const enKeys = Object.keys(frag.en ?? {}).sort().join(',')
  if (itKeys !== enKeys) console.warn(`[merge] ${ns}: it/en key mismatch`)
}

writeFileSync(join(msgDir, 'it.json'), JSON.stringify(it, null, 2) + '\n')
writeFileSync(join(msgDir, 'en.json'), JSON.stringify(en, null, 2) + '\n')

// Remove the fragments dir once merged.
rmSync(fragDir, { recursive: true, force: true })

console.log(`[merge] ${nsCount} namespaces, ~${keyCount} keys → it.json / en.json`)
