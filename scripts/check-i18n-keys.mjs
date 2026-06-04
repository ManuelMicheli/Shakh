// Static check: every `t("key")` call (where t = useTranslations/getTranslations("ns"))
// resolves to an existing message in BOTH it.json and en.json. Best-effort regex.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = join(root, 'src')
const it = JSON.parse(readFileSync(join(src, 'messages', 'it.json'), 'utf8'))
const en = JSON.parse(readFileSync(join(src, 'messages', 'en.json'), 'utf8'))

function get(obj, ns, key) {
  let node = obj[ns]
  if (node === undefined) return undefined
  for (const p of key.split('.')) {
    if (node == null || typeof node !== 'object') return undefined
    node = node[p]
  }
  return node
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    const s = statSync(p)
    if (s.isDirectory()) walk(p, out)
    else if (/\.(tsx?|ts)$/.test(name)) out.push(p)
  }
  return out
}

const files = walk(src)
const missing = []
const declRe = /(?:const|let)\s+(\w+)\s*=\s*(?:await\s+)?(?:useTranslations|getTranslations)\(\s*["'`]([^"'`]+)["'`]\s*\)/g
const callReTpl = (v) => new RegExp(`\\b${v}(?:\\.rich)?\\(\\s*["'\`]([^"'\`]+)["'\`]`, 'g')

for (const f of files) {
  const code = readFileSync(f, 'utf8')
  const vars = {}
  let m
  declRe.lastIndex = 0
  while ((m = declRe.exec(code))) vars[m[1]] = m[2]
  for (const [v, ns] of Object.entries(vars)) {
    const re = callReTpl(v)
    let c
    while ((c = re.exec(code))) {
      const key = c[1]
      const inIt = get(it, ns, key) !== undefined
      const inEn = get(en, ns, key) !== undefined
      if (!inIt || !inEn) {
        missing.push(`${f.replace(root, '.')}  ${ns}.${key}  ${!inIt ? 'IT✗' : ''}${!inEn ? ' EN✗' : ''}`)
      }
    }
  }
}

if (missing.length) {
  console.log(`MISSING ${missing.length} keys:`)
  for (const x of missing) console.log('  ' + x)
  process.exit(1)
} else {
  console.log('All t("key") references resolve in it.json and en.json ✓')
}
