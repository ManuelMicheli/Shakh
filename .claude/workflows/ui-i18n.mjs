export const meta = {
  name: 'ui-i18n-bilingual',
  description: 'Wire all hardcoded UI strings to next-intl IT/EN using the fbeb912 diff',
  phases: [
    { title: 'Wire', detail: 'one agent per UI area → next-intl + message fragment' },
  ],
}

const RESULT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['namespace', 'filesChanged', 'keyCount', 'deferred'],
  properties: {
    namespace: { type: 'string' },
    filesChanged: { type: 'array', items: { type: 'string' } },
    keyCount: { type: 'number' },
    deferred: {
      type: 'array',
      items: { type: 'string' },
      description: 'User-facing strings left untranslated, with reason',
    },
  },
}

function uiPrompt(ns, scope, notes) {
  return `Repo: C:\\Users\\Manum\\Desktop\\progetti\\Shakh. Next.js 15 App Router; next-intl already configured (src/i18n/, src/messages/{it,en}.json; existing namespaces: landing, footer, common, consent — do NOT touch those).

You migrate hardcoded UI strings to next-intl for ONE area.
- Namespace: "${ns}"
- Your file scope (ONLY edit files matching these globs; find them with Glob/Grep): ${scope.join(' , ')}
${notes ? '- Area notes: ' + notes + '\n' : ''}
TRANSLATIONS ARE FREE. Commit fbeb912 ("translate entire platform UI to English") flipped these exact files IT→EN. For each file run:
    git show fbeb912 -- <file>
Each '-' line = the ITALIAN original; the matching '+' line = the ENGLISH current literal in the code. Use that as your it/en pair. For any user-facing string NOT in that diff (added later), translate the English into natural, idiomatic Italian yourself (this is an Italian chess-learning product; use standard Italian chess terms).

DO:
1. Replace EVERY user-facing string in your files with a next-intl call keyed under "${ns}": JSX text, button labels, placeholder=, aria-label=, title=, alt=, CardTitle/CardDescription text, MobilePageHeader eyebrow/title/desc props, empty-state text, toast({title, description}) strings, Dialog title/description.
   - Client component (file starts with "use client"): import { useTranslations } from "next-intl"; const t = useTranslations("${ns}"); then t("key").
   - Server component (async function, NO "use client"): import { getTranslations } from "next-intl/server"; const t = await getTranslations("${ns}"); then t("key").
   - Dynamic interpolation → ICU params: t("greeting", { name }) with Italian message "Ciao, {name}" / English "Hi, {name}".
2. Keys: short, descriptive, UNIQUE within the namespace; dotted nesting allowed (e.g. "deleteDialog.title"). Reuse one key if the same string appears multiple times in your files.
3. Write a fragment file at src/messages/_fragments/${ns}.json EXACTLY shaped:
   { "namespace": "${ns}", "it": { "<key>": "<italian>", ... }, "en": { "<key>": "<english>", ... } }
   Keys FLAT (dotted strings, not nested objects). EVERY key used in code MUST be present in BOTH "it" and "en".

DO NOT:
- Edit src/messages/it.json or en.json (a central merge handles them).
- Touch files outside your scope, or any DB-select / content_items / traps / path_nodes column logic (already localized — leave it).
- Change layout, classNames, logic, or behavior. ONLY swap string literals for t() calls + add the t setup import/const.
- Translate chess notation rendered in mono (SAN/FEN/PGN/ECO codes, evals like +1.4) — leave as-is.
- Run the dev server or npm build (the orchestrator builds centrally). Do not start background processes.

Keep Italian code comments and explicit types. Be thorough: a missed string stays English. Return the structured result (namespace, files changed, key count, any deferred strings).`
}

const AREAS = [
  { ns: 'nav', scope: ['src/components/layout/**'], notes: 'nav.ts is a plain TS module (not a component) — it cannot call hooks. Convert its labels to i18n KEYS (string ids) and translate them at render time in sidebar.tsx / mobile-nav.tsx via useTranslations("nav"). site-footer.tsx ALREADY uses next-intl — skip it. FirstRunLocale.tsx is intentionally bilingual — skip it.' },
  { ns: 'dashboard', scope: ['src/app/app/page.tsx', 'src/app/app/loading.tsx', 'src/components/progress/**'], notes: '' },
  { ns: 'profile', scope: ['src/components/profile/**', 'src/app/app/profilo/**'], notes: 'ProfileSettings.tsx is the densest (~60 strings incl. toasts). The language picker labels "Italiano"/"English" stay literal (they name the languages).' },
  { ns: 'tactics', scope: ['src/app/app/tattiche/**', 'src/app/app/calcolo/**', 'src/components/tactics/**', 'src/components/calc/**'], notes: '' },
  { ns: 'theory', scope: ['src/app/app/teoria/**', 'src/app/app/impara/**', 'src/components/theory/**', 'src/components/learn/**'], notes: 'These pages already had their DB content-select localized — do NOT change any supabase select or *_it/*_en logic; only swap hardcoded chrome strings.' },
  { ns: 'games', scope: ['src/app/app/partite/**', 'src/components/games/**', 'src/components/analysis/**'], notes: '' },
  { ns: 'groups', scope: ['src/app/app/gruppi/**', 'src/components/groups/**'], notes: 'Many toast messages across components.' },
  { ns: 'play', scope: ['src/app/app/gioca/**', 'src/app/app/sparring/**', 'src/components/play/**', 'src/components/sparring/**'], notes: '' },
  { ns: 'study', scope: ['src/app/app/coach/**', 'src/app/app/repertorio/**', 'src/app/app/percorso/**', 'src/app/app/debolezze/**', 'src/app/app/prep/**', 'src/components/coach/**', 'src/components/repertoire/**', 'src/components/percorso/**', 'src/components/weakness/**', 'src/components/debolezze/**'], notes: 'percorso pages already had DB content-select localized — leave that logic; only chrome strings.' },
  { ns: 'common', scope: ['src/components/ui/**', 'src/app/app/onboarding/**', 'src/components/onboarding/**'], notes: 'Mostly aria-labels (Close, Open menu) and any onboarding copy. pwa/InstallButton already uses next-intl — skip pwa.' },
]

const LIB_PROMPT = `Repo: C:\\Users\\Manum\\Desktop\\progetti\\Shakh. Next.js 15; next-intl configured.

Scope: src/lib/** modules that produce USER-FACING text (NOT React components). Examples: src/lib/analysis/labels.ts (move classification labels), src/lib/tactics/themes.ts (theme labels), src/lib/traps/types.ts (category/side/motif labels), src/lib/play/time-controls.ts, src/lib/path/recommend.ts (recommendation labels), src/lib/learn/concepts.ts & guided.ts, src/lib/daily/plan.ts, src/lib/progress/aggregate.ts (competence area labels), src/lib/sparring/opponent.ts, src/lib/repair/motif.ts, src/lib/weakness/engine.ts, src/lib/games/providers.ts (error messages), src/lib/engine/explain.ts, src/lib/ai/format.ts, src/lib/chess/summary.ts, src/lib/theory/tablebase.ts, src/lib/groups/assignments.ts & class.ts & types.ts.

TRANSLATIONS ARE FREE: commit fbeb912 flipped all these IT→EN. Run \`git show fbeb912 -- <file>\` — '-' = Italian, '+' = English.

GOAL: make these modules bilingual WITHOUT breaking their callers.
Strategy per file:
- If the module exports a STATIC LABEL MAP / constant strings (e.g. a record classification→label), convert each label to a bilingual pair { it, en } and add/extend an exported accessor that takes a locale: e.g. \`label(key, locale)\`. Where the existing public shape returns a plain label string, ADD a locale-aware variant rather than breaking the old signature unless you also update all callers in src/lib and src/components.
- If a function GENERATES PROSE (e.g. engine/explain.ts builds sentences, weakness/engine narrative, ai/format), and threading a locale param cleanly through its callers is large/risky, DEFER it: do NOT half-change it. Record it in "deferred" with the reason. Prefer correctness over coverage.
- For simple, self-contained label maps with few callers, DO convert and update the callers (search usages with Grep). Keep the build conceptually intact (correct types).

The active locale on the server: import { activeLocale } from "@/lib/i18n/content" (returns 'it'|'en', async). For pure modules with no request context, accept a locale parameter from the caller instead.

DO NOT edit React components' JSX (another effort owns those) EXCEPT where you must update a call site to pass locale into a label function — in that case make the MINIMAL change to that call. Do NOT edit src/messages/*. Do NOT run dev/build.

This is the hard, judgement-heavy area. Be conservative: convert what is safe, DEFER prose generators with a clear reason. Return structured result: namespace "lib", files changed, count of labels localized, and a "deferred" list of every module/function you intentionally left English with the reason.`

phase('Wire')

const results = await parallel([
  ...AREAS.map((a) => () =>
    agent(uiPrompt(a.ns, a.scope, a.notes), {
      label: `i18n:${a.ns}`,
      phase: 'Wire',
      schema: RESULT_SCHEMA,
    }),
  ),
  () => agent(LIB_PROMPT, { label: 'i18n:lib', phase: 'Wire', schema: RESULT_SCHEMA }),
])

return results.filter(Boolean)
