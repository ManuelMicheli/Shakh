/**
 * Push dei seed Teoria (06a/06b) direttamente su Supabase via service role
 * (REST), riusando i builder reali di `moveTree` — niente SQL da incollare a
 * mano, dati garantiti coerenti col runtime. Idempotente sullo slug.
 *
 *   npx tsx scripts/push-seeds.mts
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import {
  loadPgnWithVariations,
  serializeTree,
  toPgn,
  mainlineIds,
  annotateNode,
  type MoveTree,
  type Shape,
} from "../src/lib/chess/moveTree.ts";
import type { Lesson, LessonStep } from "../src/lib/theory/types.ts";

const STARTPOS = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const FAM_OPEN = "a1111111-0000-4000-8000-000000000001";
const FAM_CARO = "a1111111-0000-4000-8000-000000000002";

async function loadEnv(): Promise<void> {
  try {
    const raw = await readFile(join(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq < 0) continue;
      const key = t.slice(0, eq).trim();
      let value = t.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    /* env già nell'ambiente */
  }
}

function findByPath(tree: MoveTree, sans: string[]): string {
  let cur = tree.nodes[tree.rootId];
  for (const san of sans) {
    const childId = cur.children.find((c) => tree.nodes[c].san === san);
    if (!childId) throw new Error(`Percorso assente: ${sans.join(" ")} (manca ${san})`);
    cur = tree.nodes[childId];
  }
  return cur.id;
}
function assertMainline(tree: MoveTree, expected: string[]) {
  const got = mainlineIds(tree).map((i) => tree.nodes[i].san).filter(Boolean);
  if (got.join(" ") !== expected.join(" ")) {
    throw new Error(`Mainline inattesa: ${got.join(" ")}`);
  }
}
interface StepSpec { path: string[]; text: string; shapes?: Shape[]; highlightMoves?: string[] }
function buildLesson(intro: string, pgn: string, mainline: string[], specs: StepSpec[], annotate?: (t: MoveTree) => MoveTree) {
  let tree = loadPgnWithVariations(pgn, STARTPOS);
  if (annotate) tree = annotate(tree);
  assertMainline(tree, mainline);
  const steps: LessonStep[] = specs.map((s) => ({
    nodeId: findByPath(tree, s.path),
    text: s.text,
    shapes: s.shapes,
    highlightMoves: s.highlightMoves,
  }));
  const lesson: Lesson = { intro, tree: serializeTree(tree), steps };
  return { lesson, linePgn: toPgn(tree) };
}

// ── 06a: lezione campione (Giuoco Piano minimo) ──
const giuoco = buildLesson(
  "Una mini-lezione campione sul Giuoco Piano (Apertura Italiana), per mostrare come funziona il modulo Teoria: passi guidati, varianti, explorer e coach.",
  "1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 (3... Nf6 4. Ng5) 4. c3 Nf6",
  ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "c3", "Nf6"],
  [
    { path: ["e4"], text: "Il Bianco occupa il centro e libera alfiere e donna. È la mossa di apertura più diretta.", shapes: [{ orig: "e2", dest: "e4", brush: "green" }] },
    { path: ["e4", "e5", "Nf3", "Nc6", "Bc4"], text: "L'Alfiere italiano si punta su f7, la casa più debole del campo nero (difesa dal solo Re). È l'idea che dà il nome all'apertura.", shapes: [{ orig: "c4", dest: "f7", brush: "red" }, { orig: "f7", brush: "red" }], highlightMoves: ["Bc5", "Nf6"] },
    { path: ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5"], text: "Il Nero risponde in modo simmetrico: anche il suo alfiere mira a f2. Nasce il Giuoco Piano, posizionale e equilibrato." },
    { path: ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "c3"], text: "Con c3 il Bianco prepara d4: vuole costruire un grande centro di pedoni e guadagnare spazio. Prova a deviare con un'altra mossa per vedere cosa dice il motore." },
  ],
  (t) => annotateNode(t, findByPath(t, ["e4", "e5", "Nf3", "Nc6", "Bc4", "Nf6", "Ng5"]), {
    comment: "Difesa dei due cavalli: 4. Cg5 attacca subito f7, gioco tagliente.",
    nags: [5],
  }),
);

// ── 06b: Italiana (Bianco) ──
const italiana = buildLesson(
  "Bozza da revisione. La Partita Italiana (Giuoco Piano): sviluppo naturale e pressione su f7, poi c3-d4 per il centro.",
  "1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 (3... Nf6 4. Ng5 {Difesa dei due cavalli, tagliente.}) (3... Be7 {più prudente.}) 4. c3 Nf6 5. d4 exd4 6. cxd4 Bb4+ 7. Nc3",
  ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "c3", "Nf6", "d4", "exd4", "cxd4", "Bb4+", "Nc3"],
  [
    { path: ["e4", "e5", "Nf3", "Nc6", "Bc4"], text: "L'alfiere si punta su f7, la casa più debole del campo nero. È l'idea che dà il nome all'Italiana.", shapes: [{ orig: "c4", dest: "f7", brush: "red" }, { orig: "f7", brush: "red" }], highlightMoves: ["Bc5", "Nf6", "Be7"] },
    { path: ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "c3"], text: "c3 prepara d4: il Bianco vuole un grande centro di pedoni e più spazio.", shapes: [{ orig: "d2", dest: "d4", brush: "green" }] },
    { path: ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "c3", "Nf6", "d4"], text: "Rotto il centro con d4: si aprono le linee e inizia il vero gioco. Prova a deviare per vedere cosa dice il motore." },
  ],
);

// ── 06b: Caro-Kann (Nero) ──
const caro = buildLesson(
  "Bozza da revisione. La Caro-Kann: solida e istruttiva. Il Nero apre alla difesa con c6+d5 senza chiudere l'alfiere campochiaro.",
  "1. e4 c6 2. d4 d5 3. Nc3 (3. exd5 cxd5 4. Bd3 Nc6 {Variante di cambio.}) dxe4 4. Nxe4 Bf5 5. Ng3 Bg6 6. h4 h6 7. Nf3 Nd7",
  ["e4", "c6", "d4", "d5", "Nc3", "dxe4", "Nxe4", "Bf5", "Ng3", "Bg6", "h4", "h6", "Nf3", "Nd7"],
  [
    { path: ["e4", "c6", "d4", "d5"], text: "Con c6 e d5 il Nero contesta il centro come nella Francese, ma SENZA imprigionare l'alfiere campochiaro: è il pregio della Caro-Kann.", shapes: [{ orig: "d5", dest: "e4", brush: "green" }] },
    { path: ["e4", "c6", "d4", "d5", "Nc3", "dxe4", "Nxe4", "Bf5"], text: "Mossa chiave: l'alfiere esce ATTIVO in f5, fuori dalla catena di pedoni, prima di giocare e6. È la differenza con la Francese.", shapes: [{ orig: "f5", brush: "green" }] },
    { path: ["e4", "c6", "d4", "d5", "Nc3", "dxe4", "Nxe4", "Bf5", "Ng3", "Bg6", "h4", "h6", "Nf3", "Nd7"], text: "Struttura tipica raggiunta: il Nero è solido, pronto a e6, Ngf6, Bd6 e arrocco corto. Esplora le alternative col motore e l'explorer." },
  ],
);

const rows = [
  { id: "a3333333-0000-4000-8000-000000000001", type: "opening", parent_id: null, eco_code: "C50", title: "Giuoco Piano — l'idea dell'Italiana", slug: "giuoco-piano-esempio", summary: "Mini-lezione di esempio: l'Apertura Italiana e l'attacco a f7.", body: giuoco.lesson, start_fen: STARTPOS, line_pgn: giuoco.linePgn, level: 0, order_index: 0, published: true },
  { id: FAM_OPEN, type: "opening", parent_id: null, eco_code: null, title: "Aperture aperte (1.e4 e5)", slug: "aperture-aperte", summary: "Le aperture che nascono da 1.e4 e5.", body: null, start_fen: STARTPOS, line_pgn: null, level: 0, order_index: 1, published: true },
  { id: FAM_CARO, type: "opening", parent_id: null, eco_code: "B10", title: "Difesa Caro-Kann (1.e4 c6)", slug: "caro-kann", summary: "Una difesa solida e di principio contro 1.e4.", body: null, start_fen: STARTPOS, line_pgn: null, level: 0, order_index: 2, published: true },
  { id: "a2222222-0000-4000-8000-000000000001", type: "opening", parent_id: FAM_OPEN, eco_code: "C50", title: "Partita Italiana — Giuoco Piano", slug: "italiana-giuoco-piano", summary: "Bozza da revisione: sviluppo, f7 e centro c3-d4.", body: italiana.lesson, start_fen: STARTPOS, line_pgn: italiana.linePgn, level: 0, order_index: 1, published: true },
  { id: "a2222222-0000-4000-8000-000000000002", type: "opening", parent_id: FAM_CARO, eco_code: "B12", title: "Caro-Kann — linea principale", slug: "caro-kann-principale", summary: "Bozza da revisione: l'alfiere attivo in f5 e la struttura tipica.", body: caro.lesson, start_fen: STARTPOS, line_pgn: caro.linePgn, level: 0, order_index: 1, published: true },
];

await loadEnv();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Mancano NEXT_PUBLIC_SUPABASE_URL e/o SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false } });

const { error } = await supabase.from("content_items").upsert(rows, { onConflict: "slug" });
if (error) {
  console.error("Upsert fallito:", error.message);
  process.exit(1);
}
console.log(`OK: ${rows.length} content_items upsertati.`);
