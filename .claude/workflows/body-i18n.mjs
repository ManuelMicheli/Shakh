export const meta = {
  name: 'body-i18n',
  description: 'Translate seeded lesson/trap bodies IT→EN (text fields only) into body_en',
  phases: [{ title: 'Translate', detail: 'one agent per seed file → {slug, bodyEn}' }],
}

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['translations'],
  properties: {
    translations: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['slug', 'bodyEn'],
        properties: {
          slug: { type: 'string' },
          bodyEn: { type: 'object', additionalProperties: true },
        },
      },
    },
  },
}

function prompt(file, table) {
  return `Repo: C:\\Users\\Manum\\Desktop\\progetti\\Shakh. Task: translate the Italian lesson bodies in ${file} to English.

The file ${file} contains SQL \`insert into ${table} (... body ...)\` statements. Each row has a \`slug\` and a \`body\` column holding a JSON object (cast \`::jsonb\`). Read the file and extract, for EVERY row, the slug and its body JSON.

The body JSON looks like: { "intro": "...", "tree": { "nodes": { "n0": {..., "comment": "..."} , ... }, "rootId": "...", "seq": N }, "steps": [ { "nodeId": "...", "text": "...", "shapes": [...], "highlightMoves": [...] }, ... ] }.

Translate to natural, idiomatic ENGLISH ONLY these text fields:
  - body.intro
  - every steps[i].text
  - every node .comment (inside tree.nodes.*)
  - any other human-readable prose field if present (e.g. a "title"/"goal"/"summary" inside the body)
Use standard English chess terminology (e.g. "fork", "pin", "outpost", "opposition", "isolated queen's pawn (IQP)", "seventh rank", "f7 is the weakest square").

PRESERVE EXACTLY (do NOT translate or alter): the whole structure and ALL other fields — fen, san, uci, ply, id, parentId, children, rootId, seq, shapes (orig/dest/brush), highlightMoves (these are SAN moves), nags, nodeId, numbers, booleans. Chess move notation (SAN like Nf3, Bc4, O-O) stays as-is.

Return structured: translations = array of { slug, bodyEn } where bodyEn is the COMPLETE body object with only the prose translated and everything else identical to the source. Output valid JSON objects (the runtime will serialize them). Be exhaustive — every row in the file.

Do NOT edit any files. Do NOT run build. Only read and return the translations.`
}

phase('Translate')

const FILES = [
  { file: 'supabase/migrations/0004_theory_seed.sql', table: 'content_items', label: 'bodies:0004' },
  { file: 'supabase/migrations/0006_aperture_seed.sql', table: 'content_items', label: 'bodies:0006' },
  { file: 'supabase/migrations/0007_theory_06c_seed.sql', table: 'content_items', label: 'bodies:0007' },
  { file: 'supabase/migrations/0008_traps_seed.sql', table: 'traps', label: 'bodies:0008' },
]

const results = await parallel(
  FILES.map((f) => () =>
    agent(prompt(f.file, f.table), { label: f.label, phase: 'Translate', schema: SCHEMA }),
  ),
)

return results.filter(Boolean)
