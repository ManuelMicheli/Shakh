/**
 * Genera la migration di seed con UNA lezione campione (prompt 06a §8): serve
 * solo a validare l'infrastruttura end-to-end (albero, passi, explorer,
 * deviazione + coach). NON è contenuto reale del prodotto: quello arriva in 06b/c.
 *
 * Costruisce l'albero con la VERA libreria `moveTree` così gli id dei nodi
 * combaciano col runtime, poi scrive `supabase/migrations/0004_theory_seed.sql`.
 *
 *   npx tsx scripts/seed-theory.mts
 */
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Chess } from "chess.js";
import {
  loadPgnWithVariations,
  serializeTree,
  toPgn,
  annotateNode,
  type MoveTree,
  type Shape,
} from "../src/lib/chess/moveTree.ts";
import type { Lesson, LessonStep } from "../src/lib/theory/types.ts";

const STARTPOS = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

/** Trova il nodo seguendo un percorso di SAN dalla radice. */
function findByPath(tree: MoveTree, sans: string[]): string {
  let cur = tree.nodes[tree.rootId];
  for (const san of sans) {
    const childId = cur.children.find((c) => tree.nodes[c].san === san);
    if (!childId) throw new Error(`Percorso non trovato: ${sans.join(" ")} (manca ${san})`);
    cur = tree.nodes[childId];
  }
  return cur.id;
}

const PGN =
  "1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 (3... Nf6 4. Ng5) 4. c3 Nf6";

let tree = loadPgnWithVariations(PGN, STARTPOS);

// Annota la variante aggressiva (Fegatello/Two Knights) con un commento.
const ng5Id = findByPath(tree, ["e4", "e5", "Nf3", "Nc6", "Bc4", "Nf6", "Ng5"]);
tree = annotateNode(tree, ng5Id, {
  comment: "Difesa dei due cavalli: 4. Cg5 attacca subito f7, gioco tagliente.",
  nags: [5],
});

const arrowF7: Shape = { orig: "c4", dest: "f7", brush: "red" };
const circleF7: Shape = { orig: "f7", brush: "red" };

const steps: LessonStep[] = [
  {
    nodeId: findByPath(tree, ["e4"]),
    text: "Il Bianco occupa il centro e libera alfiere e donna. È la mossa di apertura più diretta.",
    shapes: [{ orig: "e2", dest: "e4", brush: "green" }],
  },
  {
    nodeId: findByPath(tree, ["e4", "e5", "Nf3", "Nc6", "Bc4"]),
    text: "L'Alfiere italiano si punta su f7, la casa più debole del campo nero (difesa dal solo Re). È l'idea che dà il nome all'apertura.",
    shapes: [arrowF7, circleF7],
    highlightMoves: ["Bc5", "Nf6"],
  },
  {
    nodeId: findByPath(tree, ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5"]),
    text: "Il Nero risponde in modo simmetrico: anche il suo alfiere mira a f2. Nasce il Giuoco Piano, posizionale e equilibrato.",
  },
  {
    nodeId: findByPath(tree, ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "c3"]),
    text: "Con c3 il Bianco prepara d4: vuole costruire un grande centro di pedoni e guadagnare spazio. Prova a deviare con un'altra mossa per vedere cosa dice il motore.",
  },
];

const lesson: Lesson = {
  intro:
    "Una mini-lezione campione sul Giuoco Piano (Apertura Italiana), per mostrare come funziona il modulo Teoria: passi guidati, varianti, explorer e coach.",
  tree: serializeTree(tree),
  steps,
};

const linePgn = toPgn(tree);
const bodyJson = JSON.stringify(lesson);

// Verifica di sicurezza: gli step puntano a nodi esistenti.
for (const s of steps) {
  if (!lesson.tree.nodes[s.nodeId]) throw new Error(`Step verso nodo inesistente: ${s.nodeId}`);
}

const sql = `-- 0004_theory_seed.sql
-- Lezione campione del modulo Teoria (prompt 06a §8): valida l'infrastruttura
-- end-to-end. NON è contenuto reale del prodotto (arriva in 06b/06c).
-- Generato da scripts/seed-theory.mts — rigenerabile e idempotente sullo slug.

insert into content_items (type, eco_code, title, slug, summary, body, start_fen, line_pgn, level, order_index, published)
values (
  'opening',
  'C50',
  'Giuoco Piano — l''idea dell''Italiana',
  'giuoco-piano-esempio',
  'Mini-lezione di esempio: l''Apertura Italiana e l''attacco a f7.',
  '${bodyJson.replace(/'/g, "''")}'::jsonb,
  '${STARTPOS}',
  '${linePgn.replace(/'/g, "''")}',
  0,
  0,
  true
)
on conflict (slug) do update set
  type = excluded.type,
  eco_code = excluded.eco_code,
  title = excluded.title,
  summary = excluded.summary,
  body = excluded.body,
  start_fen = excluded.start_fen,
  line_pgn = excluded.line_pgn,
  published = excluded.published;
`;

const out = join(process.cwd(), "supabase", "migrations", "0004_theory_seed.sql");
await writeFile(out, sql, "utf8");

// Sanity: rigioca la mainline per confermare la legalità.
const chess = new Chess(STARTPOS);
for (const san of ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "c3", "Nf6"]) chess.move(san);

console.log("Scritto", out);
console.log("Nodi:", Object.keys(lesson.tree.nodes).length, "| Passi:", steps.length);
console.log("line_pgn:", linePgn);
