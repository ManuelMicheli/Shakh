/**
 * Catalogo ECO completo delle aperture (prompt 06b, estensione "catalogo").
 *
 * Fonte dati: lichess-org/chess-openings (licenza CC0 — pubblico dominio),
 * file data/chess-openings/{a..e}.tsv: ~3.700 linee con eco, nome, PGN.
 *
 * Pipeline motore-verificata come i seed curati: ogni PGN passa da
 * loadPgnWithVariations (chess.js rifiuta linee illegali); le righe il cui
 * PGN non valida vengono SCARTATE e segnalate, mai emesse storte.
 *
 * Gerarchia: Volume ECO (A–E) → Famiglia ("Sicilian Defense") → Variante
 * ("Sicilian Defense: Najdorf Variation"), con annidamento per sottovarianti
 * separate da virgola quando la variante madre esiste a catalogo.
 *
 * I18n: title_en = nome lichess; title_it = traduzione (dizionario famiglie
 * famose + trasformazione per parole chiave: Defense→Difesa, Variation→Variante…).
 * I corpi (Lesson) sono schede sintetiche generate in italiano: linea di
 * riferimento + rimando a motore/explorer. level=1 marca le righe "catalogo"
 * (le lezioni curate restano level=0 e in evidenza nella pagina Teoria).
 *
 *   npx tsx scripts/seed-openings-catalog.mts
 */
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import {
  loadPgnWithVariations,
  serializeTree,
  toPgn,
  mainlineIds,
} from "../src/lib/chess/moveTree.ts";
import type { Lesson } from "../src/lib/theory/types.ts";

const STARTPOS = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

// ───────────────────────────── Traduzione nomi ───────────────────────────────

/** Famiglie famose: traduzione consolidata nell'uso scacchistico italiano. */
const FAMIGLIE_IT: Record<string, string> = {
  "Sicilian Defense": "Difesa Siciliana",
  "French Defense": "Difesa Francese",
  "Caro-Kann Defense": "Difesa Caro-Kann",
  "Italian Game": "Partita Italiana",
  "Ruy Lopez": "Spagnola (Ruy Lopez)",
  "Scotch Game": "Partita Scozzese",
  "Vienna Game": "Partita Viennese",
  "King's Gambit": "Gambetto di Re",
  "King's Gambit Accepted": "Gambetto di Re Accettato",
  "King's Gambit Declined": "Gambetto di Re Rifiutato",
  "Queen's Gambit": "Gambetto di Donna",
  "Queen's Gambit Accepted": "Gambetto di Donna Accettato",
  "Queen's Gambit Declined": "Gambetto di Donna Rifiutato",
  "Slav Defense": "Difesa Slava",
  "Semi-Slav Defense": "Difesa Semi-Slava",
  "King's Indian Defense": "Difesa Est-Indiana",
  "Queen's Indian Defense": "Difesa Ovest-Indiana",
  "Nimzo-Indian Defense": "Difesa Nimzo-Indiana",
  "Bogo-Indian Defense": "Difesa Bogo-Indiana",
  "Old Indian Defense": "Difesa Antica Indiana",
  "Indian Game": "Partita Indiana",
  "Grünfeld Defense": "Difesa Grünfeld",
  "Dutch Defense": "Difesa Olandese",
  "English Opening": "Apertura Inglese",
  "Réti Opening": "Apertura Réti",
  "Catalan Opening": "Apertura Catalana",
  "Bird Opening": "Apertura Bird",
  "Scandinavian Defense": "Difesa Scandinava",
  "Pirc Defense": "Difesa Pirc",
  "Modern Defense": "Difesa Moderna",
  "Alekhine Defense": "Difesa Alekhine",
  "Philidor Defense": "Difesa Philidor",
  "Russian Game": "Partita Russa (Petrov)",
  "Four Knights Game": "Partita dei Quattro Cavalli",
  "Three Knights Opening": "Partita dei Tre Cavalli",
  "Bishop's Opening": "Partita d'Alfiere",
  "Center Game": "Partita del Centro",
  "Danish Gambit": "Gambetto Danese",
  "Ponziani Opening": "Apertura Ponziani",
  "Benoni Defense": "Difesa Benoni",
  "Czech Benoni Defense": "Difesa Benoni Ceca",
  "Benko Gambit": "Gambetto Benko (Volga)",
  "Budapest Defense": "Gambetto di Budapest",
  "London System": "Sistema di Londra",
  "Trompowsky Attack": "Attacco Trompowsky",
  "Torre Attack": "Attacco Torre",
  "Queen's Pawn Game": "Partita di Pedone di Donna",
  "King's Pawn Game": "Partita di Pedone di Re",
  "Zukertort Opening": "Apertura Zukertort",
  "Nimzo-Larsen Attack": "Attacco Nimzo-Larsen",
  "Grob Opening": "Apertura Grob",
  "Polish Opening": "Apertura Polacca (Orangutan)",
  "Elephant Gambit": "Gambetto dell'Elefante",
  "Latvian Gambit": "Gambetto Lettone",
  "Tarrasch Defense": "Difesa Tarrasch",
  "Chigorin Defense": "Difesa Chigorin",
  "Albin Countergambit": "Controgambetto Albin",
  "Blackmar-Diemer Gambit": "Gambetto Blackmar-Diemer",
  "Nimzowitsch Defense": "Difesa Nimzowitsch",
  "Owen Defense": "Difesa Owen",
  "St. George Defense": "Difesa San Giorgio",
  "Mexican Defense": "Difesa Messicana",
  "Horwitz Defense": "Difesa Horwitz",
  "King's Indian Attack": "Attacco Est-Indiano",
  "Richter-Veresov Attack": "Attacco Richter-Veresov",
  "Stonewall Attack": "Attacco Stonewall",
  "Hungarian Opening": "Apertura Ungherese",
};

/** Segmenti di variante ricorrenti con traduzione idiomatica completa. */
const SEGMENTI_IT: Record<string, string> = {
  "Main Line": "Linea principale",
  "Exchange Variation": "Variante di Cambio",
  "Advance Variation": "Variante d'Avanzata",
  "Classical Variation": "Variante Classica",
  "Modern Variation": "Variante Moderna",
  "Open Variation": "Variante Aperta",
  "Closed Variation": "Variante Chiusa",
  "Normal Variation": "Variante Normale",
  "Quiet Variation": "Variante Tranquilla",
  "Fianchetto Variation": "Variante del Fianchetto",
  "Two Knights Defense": "Difesa dei Due Cavalli",
  "Two Knights Variation": "Variante dei Due Cavalli",
  "Three Knights Variation": "Variante dei Tre Cavalli",
  "Four Knights Variation": "Variante dei Quattro Cavalli",
  "Accepted": "Accettato",
  "Declined": "Rifiutato",
  "Exchange": "Cambio",
  "Classical": "Classica",
  "Traditional": "Tradizionale",
  "General": "Impostazione generale",
  "Other variations": "Altre varianti",
  "Knight Variation": "Variante di Cavallo",
  "Bishop Variation": "Variante d'Alfiere",
  "Queen Variation": "Variante di Donna",
  "King Variation": "Variante di Re",
  "Berlin Defense": "Difesa Berlinese",
  "Open": "Aperta",
  "Closed": "Chiusa",
};

/** Parole chiave finali: "<X> Variation" → "Variante <X>" e simili. */
const KEYWORD_IT: [RegExp, string][] = [
  [/^(.*) Variation$/, "Variante $1"],
  [/^(.*) Attack$/, "Attacco $1"],
  [/^(.*) Defense$/, "Difesa $1"],
  [/^(.*) Gambit Accepted$/, "Gambetto $1 Accettato"],
  [/^(.*) Gambit Declined$/, "Gambetto $1 Rifiutato"],
  [/^(.*) Gambit$/, "Gambetto $1"],
  [/^(.*) Countergambit$/, "Controgambetto $1"],
  [/^(.*) Counterattack$/, "Contrattacco $1"],
  [/^(.*) System$/, "Sistema $1"],
  [/^(.*) Opening$/, "Apertura $1"],
  [/^(.*) Game$/, "Partita $1"],
  [/^(.*) Line$/, "Linea $1"],
  [/^(.*) Formation$/, "Formazione $1"],
  [/^(.*) Trap$/, "Trappola $1"],
  [/^(.*) Invitation$/, "Invito $1"],
];

function translateSegment(seg: string): string {
  const exact = SEGMENTI_IT[seg];
  if (exact) return exact;
  for (const [re, sub] of KEYWORD_IT) {
    const m = seg.match(re);
    if (m) return sub.replace("$1", m[1]);
  }
  return seg; // nome proprio o forma rara: resta com'è
}

function translateFamily(fam: string): string {
  const exact = FAMIGLIE_IT[fam];
  if (exact) return exact;
  return translateSegment(fam);
}

/** "Sicilian Defense: Najdorf Variation, English Attack" → titolo italiano. */
function translateName(name: string): string {
  const [fam, rest] = splitFamily(name);
  const famIt = translateFamily(fam);
  if (!rest) return famIt;
  const segs = rest.split(",").map((s) => translateSegment(s.trim()));
  return `${famIt}: ${segs.join(", ")}`;
}

// ───────────────────────────── Util ──────────────────────────────────────────

function splitFamily(name: string): [string, string | null] {
  const i = name.indexOf(":");
  if (i === -1) return [name.trim(), null];
  return [name.slice(0, i).trim(), name.slice(i + 1).trim()];
}

function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** UUID deterministico dallo slug → migration idempotente, parent_id stabili. */
function uuidFromSlug(slug: string): string {
  const h = createHash("sha1").update(`shakh-eco:${slug}`).digest("hex");
  return [
    h.slice(0, 8),
    h.slice(8, 12),
    "5" + h.slice(13, 16),
    ((parseInt(h[16], 16) & 0x3) | 0x8).toString(16) + h.slice(17, 20),
    h.slice(20, 32),
  ].join("-");
}

const q = (v: string | null): string => (v === null ? "null" : `'${v.replace(/'/g, "''")}'`);
const jb = (obj: unknown): string => `'${JSON.stringify(obj).replace(/'/g, "''")}'::jsonb`;

// ───────────────────────────── Parse TSV ─────────────────────────────────────

interface TsvRow {
  eco: string;
  name: string;
  pgn: string;
}

async function loadRows(): Promise<TsvRow[]> {
  const rows: TsvRow[] = [];
  for (const f of ["a", "b", "c", "d", "e"]) {
    const txt = await readFile(join(process.cwd(), "data", "chess-openings", `${f}.tsv`), "utf8");
    for (const line of txt.split("\n").slice(1)) {
      const t = line.trim();
      if (!t) continue;
      const [eco, name, pgn] = t.split("\t");
      if (!eco || !name || !pgn) continue;
      rows.push({ eco: eco.trim(), name: name.trim(), pgn: pgn.trim() });
    }
  }
  return rows;
}

// ───────────────────────────── Costruzione righe ─────────────────────────────

interface OutRow {
  id: string;
  parent: string | null;
  eco: string | null;
  titleEn: string;
  titleIt: string;
  slug: string;
  summaryEn: string | null;
  summaryIt: string | null;
  body: Lesson | null;
  linePgn: string | null;
  order: number;
}

const VOLUMI: { letter: string; id: string; titleIt: string; titleEn: string; sumIt: string; sumEn: string; order: number }[] = [
  { letter: "A", id: uuidFromSlug("eco-volume-a"), titleIt: "Volume A — Aperture di fianco", titleEn: "Volume A — Flank openings", sumIt: "1.c4, 1.Nf3, 1.f4 e prime mosse irregolari.", sumEn: "1.c4, 1.Nf3, 1.f4 and irregular first moves.", order: 10 },
  { letter: "B", id: uuidFromSlug("eco-volume-b"), titleIt: "Volume B — Semiaperte", titleEn: "Volume B — Semi-open games", sumIt: "1.e4 senza 1...e5: Siciliana, Caro-Kann, Pirc…", sumEn: "1.e4 without 1...e5: Sicilian, Caro-Kann, Pirc…", order: 11 },
  { letter: "C", id: uuidFromSlug("eco-volume-c"), titleIt: "Volume C — Aperte e Francese", titleEn: "Volume C — Open games and French", sumIt: "1.e4 e5 e 1.e4 e6: Italiana, Spagnola, Gambetto di Re…", sumEn: "1.e4 e5 and 1.e4 e6: Italian, Ruy Lopez, King's Gambit…", order: 12 },
  { letter: "D", id: uuidFromSlug("eco-volume-d"), titleIt: "Volume D — Chiuse e semichiuse", titleEn: "Volume D — Closed and semi-closed", sumIt: "1.d4 d5 e Grünfeld: Gambetto di Donna, Slava…", sumEn: "1.d4 d5 and Grünfeld: Queen's Gambit, Slav…", order: 13 },
  { letter: "E", id: uuidFromSlug("eco-volume-e"), titleIt: "Volume E — Indiane", titleEn: "Volume E — Indian defenses", sumIt: "1.d4 Nf6 con e6/g6: Nimzo-Indiana, Est-Indiana…", sumEn: "1.d4 Nf6 with e6/g6: Nimzo-Indian, King's Indian…", order: 14 },
];

function buildLesson(titleIt: string, eco: string, pgn: string): { lesson: Lesson; linePgn: string } | null {
  let tree;
  try {
    tree = loadPgnWithVariations(pgn, STARTPOS);
  } catch {
    return null;
  }
  const main = mainlineIds(tree);
  if (main.length < 2) return null; // serve almeno una mossa oltre la radice
  const lastId = main[main.length - 1];
  const lesson: Lesson = {
    intro:
      `${titleIt} (${eco}). Scheda di catalogo generata dai dati aperti Lichess (CC0): ` +
      `linea di riferimento ${pgn}. Segui i passi, poi esplora le alternative con il motore ` +
      `e con l'explorer delle partite dei maestri.`,
    tree: serializeTree(tree),
    steps: [
      {
        nodeId: lastId,
        text:
          "Posizione caratteristica della linea. Da qui prosegui da solo: confronta le mosse " +
          "candidate con il motore e guarda cosa giocano i maestri nell'explorer.",
      },
    ],
  };
  return { lesson, linePgn: toPgn(tree) };
}

const rows = await loadRows();

// Famiglie: nome → righe ordinate come nei TSV (ordine ECO sensato).
const byFamily = new Map<string, TsvRow[]>();
for (const r of rows) {
  const [fam] = splitFamily(r.name);
  const list = byFamily.get(fam) ?? [];
  list.push(r);
  byFamily.set(fam, list);
}

const out: OutRow[] = [];
const usedSlugs = new Set<string>();
let scartate = 0;

function uniqueSlug(base: string): string {
  let s = base;
  let i = 2;
  while (usedSlugs.has(s)) s = `${base}-${i++}`;
  usedSlugs.add(s);
  return s;
}

for (const v of VOLUMI) {
  out.push({
    id: v.id, parent: null, eco: null, titleEn: v.titleEn, titleIt: v.titleIt,
    slug: uniqueSlug(`eco-volume-${v.letter.toLowerCase()}`),
    summaryEn: v.sumEn, summaryIt: v.sumIt, body: null, linePgn: null, order: v.order,
  });
}

// Ordine alfabetico delle famiglie dentro ogni volume.
const familyNames = Array.from(byFamily.keys()).sort((a, b) => a.localeCompare(b));
const familyOrderByVolume = new Map<string, number>();

for (const fam of familyNames) {
  const famRows = byFamily.get(fam)!;
  // Volume: lettera ECO più frequente tra le righe della famiglia.
  const counts = new Map<string, number>();
  for (const r of famRows) counts.set(r.eco[0], (counts.get(r.eco[0]) ?? 0) + 1);
  const letter = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0][0];
  const volume = VOLUMI.find((v) => v.letter === letter)!;

  const famIt = translateFamily(fam);
  const ecos = Array.from(new Set(famRows.map((r) => r.eco))).sort();
  const ecoLabel = ecos.length === 1 ? ecos[0] : `${ecos[0]}–${ecos[ecos.length - 1]}`;
  const famSlug = uniqueSlug(slugify(fam));
  const famId = uuidFromSlug(famSlug);
  const ord = (familyOrderByVolume.get(volume.id) ?? 0) + 1;
  familyOrderByVolume.set(volume.id, ord);

  // Riga "pura" della famiglia (nome senza ":"), se esiste, dà corpo al nodo famiglia.
  const plainRows = famRows.filter((r) => splitFamily(r.name)[1] === null);
  const famLine = plainRows[0] ?? null;
  const famLesson = famLine ? buildLesson(famIt, famLine.eco, famLine.pgn) : null;
  if (famLine && !famLesson) scartate++;

  const nVar = famRows.length - plainRows.length;
  out.push({
    id: famId, parent: volume.id, eco: ecoLabel,
    titleEn: fam, titleIt: famIt, slug: famSlug,
    summaryEn: famLine ? famLine.pgn : `${nVar} variations in the catalog.`,
    summaryIt: famLine ? famLine.pgn : `${nVar} varianti a catalogo.`,
    body: famLesson?.lesson ?? null, linePgn: famLesson?.linePgn ?? null, order: ord,
  });

  // Varianti: figlie della famiglia; sottovarianti (dopo la virgola) annidate
  // sotto la variante madre quando questa esiste a catalogo.
  const idByVariation = new Map<string, string>(); // "Najdorf Variation" → uuid
  let childOrd = 0;

  for (const r of famRows) {
    const [, rest] = splitFamily(r.name);
    if (rest === null) {
      if (r !== famLine) {
        // Linea "pura" duplicata su altro ECO: riga figlia esplicita.
        childOrd++;
        const slug = uniqueSlug(`${slugify(fam)}-${r.eco.toLowerCase()}`);
        const built = buildLesson(famIt, r.eco, r.pgn);
        if (!built) { scartate++; continue; }
        out.push({
          id: uuidFromSlug(slug), parent: famId, eco: r.eco,
          titleEn: `${fam} (${r.eco})`, titleIt: `${famIt} (${r.eco})`, slug,
          summaryEn: r.pgn, summaryIt: r.pgn,
          body: built.lesson, linePgn: built.linePgn, order: childOrd,
        });
      }
      continue;
    }
    childOrd++;
    const titleEn = r.name;
    const titleIt = translateName(r.name);
    const slug = uniqueSlug(`${slugify(r.name)}-${r.eco.toLowerCase()}`);
    const built = buildLesson(titleIt, r.eco, r.pgn);
    if (!built) { scartate++; continue; }

    // Genitore: variante madre (primo segmento) se già vista, altrimenti famiglia.
    const segs = rest.split(",").map((s) => s.trim());
    let parent = famId;
    if (segs.length > 1) {
      const motherKey = segs.slice(0, segs.length - 1).join(", ");
      parent = idByVariation.get(motherKey) ?? idByVariation.get(segs[0]) ?? famId;
    }
    idByVariation.set(segs.join(", "), uuidFromSlug(slug));

    out.push({
      id: uuidFromSlug(slug), parent, eco: r.eco,
      titleEn, titleIt, slug,
      summaryEn: r.pgn, summaryIt: r.pgn,
      body: built.lesson, linePgn: built.linePgn, order: childOrd,
    });
  }
}

// ───────────────────────────── Emissione SQL ─────────────────────────────────

const cols =
  "id, type, parent_id, eco_code, title, slug, summary, body, start_fen, line_pgn, level, order_index, published, title_it, title_en, summary_it, summary_en";

function rowSql(r: OutRow): string {
  const cells = [
    q(r.id),
    "'opening'",
    q(r.parent),
    q(r.eco),
    q(r.titleEn), // colonna storica = inglese (stato post-0019/0021)
    q(r.slug),
    q(r.summaryEn),
    r.body ? jb(r.body) : "null",
    q(STARTPOS),
    q(r.linePgn),
    "1", // level=1: riga di catalogo (le lezioni curate restano level=0)
    String(r.order),
    "true",
    q(r.titleIt),
    q(r.titleEn),
    q(r.summaryIt),
    q(r.summaryEn),
  ];
  return `  (${cells.join(", ")})`;
}

// I genitori devono esistere prima dei figli (FK self-reference): l'array `out`
// è già in ordine volume → famiglia → varianti. Batch da 200 per file gestibile.
const BATCH = 200;
const chunks: string[] = [];
for (let i = 0; i < out.length; i += BATCH) {
  const vals = out.slice(i, i + BATCH).map(rowSql).join(",\n");
  chunks.push(`insert into content_items (${cols})
values
${vals}
on conflict (slug) do update set
  type = excluded.type,
  parent_id = excluded.parent_id,
  eco_code = excluded.eco_code,
  title = excluded.title,
  summary = excluded.summary,
  body = excluded.body,
  start_fen = excluded.start_fen,
  line_pgn = excluded.line_pgn,
  level = excluded.level,
  order_index = excluded.order_index,
  published = excluded.published,
  title_it = excluded.title_it,
  title_en = excluded.title_en,
  summary_it = excluded.summary_it,
  summary_en = excluded.summary_en;`);
}

const sql = `-- 0028_openings_catalog_seed.sql
-- Catalogo ECO completo (~${out.length} righe) generato da scripts/seed-openings-catalog.mts.
-- Fonte: lichess-org/chess-openings (CC0). Linee validate con chess.js in generazione.
-- Gerarchia: Volume A–E → famiglia → variante. level=1 = riga di catalogo.
-- Idempotente: on conflict (slug) do update.

${chunks.join("\n\n")}
`;

const outPath = join(process.cwd(), "supabase", "migrations", "0028_openings_catalog_seed.sql");
await writeFile(outPath, sql, "utf8");
console.log(`Scritto ${outPath}`);
console.log(`Righe emesse: ${out.length} (volumi 5, famiglie ${familyNames.length})`);
console.log(`Righe scartate per PGN non valido: ${scartate}`);

// ─────────────────────── Push diretto (--push) ───────────────────────────────
// Il file SQL pesa ~10MB: troppo per gli strumenti che applicano migrazioni via
// API. Con `--push` lo script fa upsert diretto via supabase-js (service role),
// stesso pattern di import-puzzles.ts. Idempotente su slug; l'array `out` è già
// ordinato genitori → figli, quindi la FK parent_id è sempre soddisfatta.

async function loadEnv(): Promise<void> {
  try {
    const raw = await readFile(join(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // .env.local assente: env già nell'ambiente.
  }
}

if (process.argv.includes("--push")) {
  await loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("[push] Mancano NEXT_PUBLIC_SUPABASE_URL e/o SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const BATCH_PUSH = 200;
  let done = 0;
  for (let i = 0; i < out.length; i += BATCH_PUSH) {
    const rows = out.slice(i, i + BATCH_PUSH).map((r) => ({
      id: r.id,
      type: "opening",
      parent_id: r.parent,
      eco_code: r.eco,
      title: r.titleEn,
      slug: r.slug,
      summary: r.summaryEn,
      body: r.body,
      start_fen: STARTPOS,
      line_pgn: r.linePgn,
      level: 1,
      order_index: r.order,
      published: true,
      title_it: r.titleIt,
      title_en: r.titleEn,
      summary_it: r.summaryIt,
      summary_en: r.summaryEn,
    }));
    const { error } = await supabase.from("content_items").upsert(rows, { onConflict: "slug" });
    if (error) {
      console.error(`[push] Errore al batch ${i / BATCH_PUSH + 1}:`, error.message);
      process.exit(1);
    }
    done += rows.length;
    console.log(`[push] ${done}/${out.length}`);
  }
  console.log("[push] Catalogo aperture caricato.");
}
