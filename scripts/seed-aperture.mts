/**
 * Seed-vetrina del ramo Aperture (prompt 06b §6): UNA apertura per colore,
 * "profondità prima di ampiezza". Pipeline motore-verificata: le linee (SAN)
 * sono validate da chess.js (loadPgnWithVariations rifiuta le illegali e qui
 * assertiamo la mainline attesa); le mosse principali seguono ciò che si gioca
 * davvero; NIENTE valutazioni inventate (campo eval lasciato vuoto).
 *
 * Contenuti marcati BOZZA DA REVISIONE: punto di partenza, non verità definitiva.
 *
 *   npx tsx scripts/seed-aperture.mts
 */
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  loadPgnWithVariations,
  serializeTree,
  toPgn,
  mainlineIds,
  type MoveTree,
  type Shape,
} from "../src/lib/chess/moveTree.ts";
import type { Lesson, LessonStep } from "../src/lib/theory/types.ts";

const STARTPOS = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

// UUID fissi → migration idempotente e parent_id stabile tra rigenerazioni.
const FAM_OPEN = "a1111111-0000-4000-8000-000000000001";
const FAM_CARO = "a1111111-0000-4000-8000-000000000002";

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
  const got = mainlineIds(tree)
    .map((i) => tree.nodes[i].san)
    .filter(Boolean);
  if (got.join(" ") !== expected.join(" ")) {
    throw new Error(`Mainline inattesa:\n  atteso: ${expected.join(" ")}\n  ottenuto: ${got.join(" ")}`);
  }
}

interface StepSpec {
  path: string[];
  text: string;
  shapes?: Shape[];
  highlightMoves?: string[];
}

function buildLesson(intro: string, pgn: string, mainline: string[], specs: StepSpec[]): {
  lesson: Lesson;
  linePgn: string;
} {
  const tree = loadPgnWithVariations(pgn, STARTPOS);
  assertMainline(tree, mainline);
  const steps: LessonStep[] = specs.map((s) => ({
    nodeId: findByPath(tree, s.path),
    text: s.text,
    shapes: s.shapes,
    highlightMoves: s.highlightMoves,
  }));
  for (const s of steps) if (!tree.nodes[s.nodeId]) throw new Error(`Step verso nodo assente: ${s.nodeId}`);
  return { lesson: { intro, tree: serializeTree(tree), steps }, linePgn: toPgn(tree) };
}

// ───────────────────────────── Bianco: Italiana ──────────────────────────────
const italiana = buildLesson(
  "Bozza da revisione. La Partita Italiana (Giuoco Piano): sviluppo naturale e pressione su f7, poi c3-d4 per il centro.",
  "1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 (3... Nf6 4. Ng5 {Difesa dei due cavalli, tagliente.}) (3... Be7 {più prudente.}) 4. c3 Nf6 5. d4 exd4 6. cxd4 Bb4+ 7. Nc3",
  ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "c3", "Nf6", "d4", "exd4", "cxd4", "Bb4+", "Nc3"],
  [
    {
      path: ["e4", "e5", "Nf3", "Nc6", "Bc4"],
      text: "L'alfiere si punta su f7, la casa più debole del campo nero. È l'idea che dà il nome all'Italiana.",
      shapes: [{ orig: "c4", dest: "f7", brush: "red" }, { orig: "f7", brush: "red" }],
      highlightMoves: ["Bc5", "Nf6", "Be7"],
    },
    {
      path: ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "c3"],
      text: "c3 prepara d4: il Bianco vuole un grande centro di pedoni e più spazio.",
      shapes: [{ orig: "d2", dest: "d4", brush: "green" }],
    },
    {
      path: ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "c3", "Nf6", "d4"],
      text: "Rotto il centro con d4: si aprono le linee e inizia il vero gioco. Prova a deviare per vedere cosa dice il motore.",
    },
  ],
);

// ──────────────────────── Nero contro 1.e4: Caro-Kann ─────────────────────────
const caro = buildLesson(
  "Bozza da revisione. La Caro-Kann: solida e istruttiva. Il Nero apre alla difesa con c6+d5 senza chiudere l'alfiere campochiaro.",
  "1. e4 c6 2. d4 d5 3. Nc3 (3. exd5 cxd5 4. Bd3 Nc6 {Variante di cambio.}) dxe4 4. Nxe4 Bf5 5. Ng3 Bg6 6. h4 h6 7. Nf3 Nd7",
  ["e4", "c6", "d4", "d5", "Nc3", "dxe4", "Nxe4", "Bf5", "Ng3", "Bg6", "h4", "h6", "Nf3", "Nd7"],
  [
    {
      path: ["e4", "c6", "d4", "d5"],
      text: "Con c6 e d5 il Nero contesta il centro come nella Francese, ma SENZA imprigionare l'alfiere campochiaro: è il pregio della Caro-Kann.",
      shapes: [{ orig: "d5", dest: "e4", brush: "green" }],
    },
    {
      path: ["e4", "c6", "d4", "d5", "Nc3", "dxe4", "Nxe4", "Bf5"],
      text: "Mossa chiave: l'alfiere esce ATTIVO in f5, fuori dalla catena di pedoni, prima di giocare e6. È la differenza con la Francese.",
      shapes: [{ orig: "f5", brush: "green" }],
    },
    {
      path: ["e4", "c6", "d4", "d5", "Nc3", "dxe4", "Nxe4", "Bf5", "Ng3", "Bg6", "h4", "h6", "Nf3", "Nd7"],
      text: "Struttura tipica raggiunta: il Nero è solido, pronto a e6, Ngf6, Bd6 e arrocco corto. Esplora le alternative col motore e l'explorer.",
    },
  ],
);

/** Literal SQL stringa (o null), con escape degli apici. */
const q = (v: string | null): string => (v === null ? "null" : `'${v.replace(/'/g, "''")}'`);
/** Literal jsonb. */
const jb = (obj: unknown): string => `'${JSON.stringify(obj).replace(/'/g, "''")}'::jsonb`;

interface RowSpec {
  id: string;
  parent: string | null;
  eco: string | null;
  title: string;
  slug: string;
  summary: string | null;
  body: Lesson | null;
  linePgn: string | null;
  order: number;
}

function buildRow(r: RowSpec): string {
  const cells = [
    q(r.id),
    "'opening'",
    q(r.parent),
    q(r.eco),
    q(r.title),
    q(r.slug),
    q(r.summary),
    r.body ? jb(r.body) : "null",
    q(STARTPOS),
    q(r.linePgn),
    "0",
    String(r.order),
    "true",
  ];
  return `  (${cells.join(", ")})`;
}

const allSpecs: RowSpec[] = [
  { id: FAM_OPEN, parent: null, eco: null, title: "Aperture aperte (1.e4 e5)", slug: "aperture-aperte", summary: "Le aperture che nascono da 1.e4 e5.", body: null, linePgn: null, order: 1 },
  { id: FAM_CARO, parent: null, eco: "B10", title: "Difesa Caro-Kann (1.e4 c6)", slug: "caro-kann", summary: "Una difesa solida e di principio contro 1.e4.", body: null, linePgn: null, order: 2 },
  { id: "a2222222-0000-4000-8000-000000000001", parent: FAM_OPEN, eco: "C50", title: "Partita Italiana — Giuoco Piano", slug: "italiana-giuoco-piano", summary: "Bozza da revisione: sviluppo, f7 e centro c3-d4.", body: italiana.lesson, linePgn: italiana.linePgn, order: 1 },
  { id: "a2222222-0000-4000-8000-000000000002", parent: FAM_CARO, eco: "B12", title: "Caro-Kann — linea principale", slug: "caro-kann-principale", summary: "Bozza da revisione: l'alfiere attivo in f5 e la struttura tipica.", body: caro.lesson, linePgn: caro.linePgn, order: 1 },
];

const cols =
  "id, type, parent_id, eco_code, title, slug, summary, body, start_fen, line_pgn, level, order_index, published";
const allRows = allSpecs.map(buildRow).join(",\n");

const sql = `-- 0006_aperture_seed.sql
-- Seed-vetrina del ramo Aperture (prompt 06b §6): una apertura per colore,
-- pipeline motore-verificata (linee validate da chess.js). Contenuti marcati
-- BOZZA DA REVISIONE. Generato da scripts/seed-aperture.mts — idempotente sullo slug.
-- Le righe 'body' (jsonb) usano il cast esplicito ::jsonb dove presenti.

insert into content_items (${cols})
values
${allRows}
on conflict (slug) do update set
  type = excluded.type,
  parent_id = excluded.parent_id,
  eco_code = excluded.eco_code,
  title = excluded.title,
  summary = excluded.summary,
  body = excluded.body,
  start_fen = excluded.start_fen,
  line_pgn = excluded.line_pgn,
  order_index = excluded.order_index,
  published = excluded.published;
`;

const out = join(process.cwd(), "supabase", "migrations", "0006_aperture_seed.sql");
await writeFile(out, sql, "utf8");
console.log("Scritto", out);
console.log("Italiana mainline:", italiana.linePgn);
console.log("Caro-Kann mainline:", caro.linePgn);
