// Apply translated lesson/trap bodies (body_en) from the body-i18n workflow result.
// Usage: node scripts/apply-body-en.mjs <workflow-output-file.json>
import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const TRAP_SLUGS = new Set([
  'matto-di-legal', 'fegato-fritto', 'trappola-di-lasker-albin', 'blackburne-shilling-gambit',
  'fishing-pole', 'elephant-trap', 'trappola-di-mortimer', 'gambetto-englund',
  'trappola-kieninger-budapest', 'difesa-damiano',
])

const file = process.argv[2]
if (!file) throw new Error('Pass the workflow output JSON file path')
const parsed = JSON.parse(readFileSync(file, 'utf8'))
const groups = Array.isArray(parsed) ? parsed : parsed.result
const translations = groups.flatMap((g) => g?.translations ?? [])

const esc = (s) => s.replace(/'/g, "''")
const stmts = translations.map(({ slug, bodyEn }) => {
  const table = TRAP_SLUGS.has(slug) ? 'traps' : 'content_items'
  return `update ${table} set body_en = '${esc(JSON.stringify(bodyEn))}'::jsonb where slug = '${esc(slug)}';`
})

const out = join(root, 'supabase', 'migrations', '_body_en_data.sql')
writeFileSync(out, stmts.join('\n') + '\n')
console.log(`Wrote ${stmts.length} UPDATE statements → ${out}`)
