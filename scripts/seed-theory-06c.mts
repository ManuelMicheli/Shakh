/**
 * Seed dei contenuti-vetrina del ramo Teoria (prompt 06c): 5 finali fondamentali
 * + 3 temi di mediogioco. Scrive `supabase/migrations/0007_theory_06c_seed.sql`.
 *
 *   npx tsx scripts/seed-theory-06c.mts
 *
 * Garanzie di correttezza (vincolo del prompt: "nessuna linea o valutazione
 * inventata"):
 *  - FINALI: la linea della lezione è la PARTITA OTTIMALE DI ENTRAMBI i lati
 *    secondo la TABLEBASE Lichess (verità assoluta), generata interrogando l'API
 *    e giocando sempre la mossa migliore. Le posizioni di pratica hanno esito
 *    verificato dalla tablebase (vedi scripts/verify-endgames.mts).
 *  - MEDIOGIOCO: posizioni e linee illustrative validate per LEGALITÀ con
 *    chess.js; le valutazioni vere arrivano dal motore a runtime.
 * Le spiegazioni in italiano sono BOZZE DA REVISIONE, non verità definitive.
 */
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Chess } from "chess.js";
import {
  createTree,
  addMove,
  annotateNode,
  serializeTree,
  toPgn,
  type MoveTree,
  type Shape,
} from "../src/lib/chess/moveTree.ts";
import { fetchTablebase } from "../src/lib/theory/tablebase.ts";
import type { Lesson, LessonStep } from "../src/lib/theory/types.ts";
import type { EndgamePractice } from "../src/lib/theory/endgame.ts";
import type { PositionalExercise } from "../src/lib/theory/middlegame.ts";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ───────────────────────────── helper comuni ─────────────────────────────

/** Aggiunge una sequenza di SAN come mainline a partire dal nodo dato; ritorna gli id. */
function addLine(
  tree: MoveTree,
  fromId: string,
  sans: string[],
): { tree: MoveTree; ids: string[] } {
  const ids: string[] = [];
  let cur = fromId;
  for (const san of sans) {
    const res = addMove(tree, cur, san);
    if (!res.nodeId) throw new Error(`Mossa illegale nella linea: ${san} (da ${cur})`);
    tree = res.tree;
    cur = res.nodeId;
    ids.push(cur);
  }
  return { tree, ids };
}

/**
 * Genera la linea OTTIMALE per entrambi i lati interrogando la tablebase e
 * giocando sempre moves[0] (la migliore per il lato al tratto). Si ferma a un
 * esito terminale o dopo `maxPlies`. Ritorna il tree e gli id dei nodi (radice
 * inclusa in `ids[0]`).
 */
async function optimalLine(
  startFen: string,
  maxPlies: number,
): Promise<{ tree: MoveTree; ids: string[] }> {
  let tree = createTree(startFen);
  let cur = tree.rootId;
  const ids = [cur];
  for (let i = 0; i < maxPlies; i++) {
    const fen = tree.nodes[cur].fen;
    if (new Chess(fen).isGameOver()) break;
    const res = await fetchTablebase(fen);
    await sleep(350);
    if (!res.ok || res.data.moves.length === 0) break;
    const best = res.data.moves[0].san;
    const added = addMove(tree, cur, best);
    if (!added.nodeId) break;
    tree = added.tree;
    cur = added.nodeId;
    ids.push(cur);
  }
  return { tree, ids };
}

// ─────────────────────────────── FINALI (5) ───────────────────────────────

interface EndgameSeed {
  slug: string;
  title: string;
  summary: string;
  order: number;
  intro: string;
  practice: EndgamePractice;
  maxPlies: number;
  /** Testi dei passi guidati, indicizzati su `ids` della linea ottimale. */
  steps: { at: number; text: string; shapes?: Shape[] }[];
}

const ENDGAMES: EndgameSeed[] = [
  {
    slug: "re-e-pedone-contro-re",
    title: "Re e pedone contro re",
    summary: "Opposizione e regola del quadrato: la base di tutti i finali.",
    order: 0,
    intro:
      "Il finale più elementare e più importante: un solo pedone. Vincere dipende dall'OPPOSIZIONE (i re in colonna, una casa di mezzo, con la mossa all'avversario) e dal controllo delle case chiave davanti al pedone. Il re deve precedere il pedone, non spingerlo a caso. (Bozza da revisione.)",
    practice: {
      fen: "4k3/8/4K3/8/4P3/8/8/8 w - - 0 1",
      userColor: "white",
      goal: "win",
      progressKey: "kp_vs_k",
      hint: "Il re davanti al pedone vale più di una spinta affrettata: cerca le case chiave e l'opposizione.",
    },
    maxPlies: 12,
    steps: [
      {
        at: 0,
        text: "Il re bianco è già due traverse davanti al pedone: condizione, da sola, vincente. Qui il pedone può correre, perché il re lo scorta.",
        shapes: [{ orig: "e6", brush: "green" }],
      },
      {
        at: 2,
        text: "Il re accompagna il pedone passo dopo passo: è il re a garantire la promozione, non la fretta della spinta. Quando manca il vantaggio del re, conta l'opposizione (vedi sopra).",
      },
      {
        at: 5,
        text: "Scortato dal re, il pedone raggiunge l'ottava e promuove. Lo schema da ricordare: nei finali di re e pedone il re viene prima del pedone.",
      },
    ],
  },
  {
    slug: "posizione-di-lucena",
    title: "Posizione di Lucena (torre)",
    summary: "La tecnica del «ponte» per vincere il finale di torre con un pedone.",
    order: 1,
    intro:
      "La posizione vinta per eccellenza nei finali di torre: il pedone è in settima, il proprio re davanti, il re avversario tagliato. La tecnica vincente è il PONTE: si porta la torre sulla quarta traversa per pararsi dagli scacchi e far uscire il re. (Bozza da revisione.)",
    practice: {
      fen: "3K4/3P4/5k2/8/8/8/r7/4R3 w - - 0 1",
      userColor: "white",
      goal: "win",
      progressKey: "lucena",
      hint: "Costruisci il «ponte»: porta la torre sulla quarta traversa, così potrai frapporla agli scacchi e liberare il re.",
    },
    maxPlies: 12,
    steps: [
      {
        at: 0,
        text: "Pedone in settima, re bianco davanti, re nero tagliato dalla torre: è la posizione di Lucena, vinta. Serve solo la tecnica giusta per far uscire il re senza perdere il pedone.",
        shapes: [
          { orig: "d7", brush: "green" },
          { orig: "e1", dest: "e4", brush: "blue" },
        ],
      },
      {
        at: 3,
        text: "Una via concreta e fortissima: promuovere e, dopo il cambio delle torri, restare con Torre e Re contro Re. Nella pratica qui sotto puoi invece allenare passo passo la tecnica del «ponte».",
      },
      {
        at: 6,
        text: "Resta un finale di Torre e Re contro Re: vittoria elementare. L'essenziale era non perdere il pedone in settima.",
      },
    ],
  },
  {
    slug: "posizione-di-philidor",
    title: "Posizione di Philidor (torre)",
    summary: "La difesa che patta il finale di torre quando l'avversario è in vantaggio.",
    order: 2,
    intro:
      "Il metodo difensivo da conoscere a memoria: finché il pedone avversario non raggiunge la sesta traversa, la torre difensiva resta sulla TERZA traversa (la sesta vista dall'attaccante) e impedisce al re nemico di avanzare. Appena il pedone spinge, la torre va dietro a dare scacchi: patta. (Bozza da revisione.)",
    practice: {
      fen: "8/4k3/r7/3KP3/8/8/8/7R b - - 0 1",
      userColor: "black",
      goal: "draw",
      progressKey: "philidor",
      hint: "Tieni la torre sulla sesta traversa finché il pedone non spinge; poi scendi a dare scacchi da dietro.",
    },
    maxPlies: 10,
    steps: [
      {
        at: 0,
        text: "Il difensore (il Nero) deve pattare. Con il re avversario già attivo sulla quinta, la torre si prepara a colpire da lontano: il pedone da solo non sfonda.",
        shapes: [{ orig: "e5", brush: "red" }],
      },
      {
        at: 4,
        text: "Appena il pedone avanza (e6), la torre tempesta di scacchi il re da dietro: non c'è riparo. È patta. (Quando il pedone è più arretrato, prima si tiene la torre sulla sesta traversa: vedi sopra.)",
      },
    ],
  },
  {
    slug: "matti-elementari",
    title: "Matti elementari",
    summary: "Re+Donna contro Re e Re+Torre contro Re: la tecnica per dare matto.",
    order: 3,
    intro:
      "I matti che ogni giocatore deve eseguire senza esitazione. Con la donna si spinge il re avversario verso il bordo mantenendo la distanza di cavallo per non dare stallo; con la torre si costruisce la «scala». Qui pratichi il matto di donna; nella linea vedi lo schema. (Bozza da revisione.)",
    practice: {
      fen: "4k3/8/4K3/8/8/8/3Q4/8 w - - 0 1",
      userColor: "white",
      goal: "win",
      progressKey: "kq_vs_k",
      hint: "Avvicina la donna a distanza di cavallo dal re nemico per restringerlo, porta il tuo re a sostegno e attento allo stallo.",
    },
    maxPlies: 8,
    steps: [
      {
        at: 0,
        text: "Con donna e re contro re solo il matto è rapidissimo. La donna restringe il re avversario verso il bordo; il proprio re si avvicina per dare il colpo finale.",
        shapes: [{ orig: "d2", brush: "green" }],
      },
      {
        at: 2,
        text: "Qb8#: matto al bordo. Nota come la donna toglie le case e spinge il re sull'ultima traversa — ma attento sempre allo STALLO quando il re nemico ha poche case e il tuo re è lontano.",
      },
    ],
  },
  {
    slug: "donna-contro-pedone",
    title: "Donna contro pedone",
    summary: "Quando la donna vince contro il pedone in settima — e quando è patta.",
    order: 4,
    intro:
      "La donna vince contro un pedone in settima se questo è un pedone centrale o di cavallo: con scacchi e attacchi si guadagna il tempo per avvicinare il re, costringendo il re nemico davanti al pedone. Con pedone di torre o di alfiere ci sono trappole di stallo e spesso è patta. Qui un pedone centrale: vinto. (Bozza da revisione.)",
    practice: {
      fen: "Q7/8/5K2/8/8/8/3p4/3k4 w - - 0 1",
      userColor: "white",
      goal: "win",
      progressKey: "q_vs_p",
      hint: "Alterna scacchi e attacchi al pedone per forzare il re nemico davanti al pedone: così guadagni il tempo per avvicinare il tuo re.",
    },
    maxPlies: 14,
    steps: [
      {
        at: 0,
        text: "Pedone centrale in settima: la donna vince. Il metodo è una serie di scacchi che forza il re nero DAVANTI al proprio pedone, bloccandolo per un tempo.",
        shapes: [{ orig: "d2", brush: "red" }],
      },
      {
        at: 4,
        text: "Ogni scacco guadagna un tempo: quando il re è inchiodato davanti al pedone, il re bianco si avvicina (Re5-e4…). Ripetendo lo schema, il re arriva e si vince.",
      },
    ],
  },
];

// ───────────────────────────── MEDIOGIOCO (3) ─────────────────────────────

interface MiddlegameSeed {
  slug: string;
  title: string;
  summary: string;
  order: number;
  intro: string;
  /** SAN dalla posizione iniziale standard fino alla posizione-tipo. */
  setup: string[];
  /** Continuazione illustrativa (mainline della lezione) dalla posizione-tipo. */
  line: string[];
  exercise: Omit<PositionalExercise, "fen" | "userColor">;
  steps: { at: number; text: string; shapes?: Shape[] }[];
}

const MIDDLEGAMES: MiddlegameSeed[] = [
  {
    slug: "pedone-isolano-di-donna-iqp",
    title: "Il pedone isolano di donna (IQP)",
    summary: "Giocare con l'isolano (attività e attacco) e contro (bloccare, puntare al finale).",
    order: 0,
    intro:
      "L'isolano di donna (qui il pedone d4 bianco, senza pedoni c ed e a sostenerlo) è forza e debolezza insieme: dà spazio, caselle attive (e5, c5) e iniziativa per l'attacco, ma in un finale diventa un bersaglio. Chi ce l'ha gioca per l'ATTIVITÀ; chi lo affronta BLOCCA la casa davanti (d5) e punta ai cambi. (Bozza da revisione.)",
    // Nimzo/QGD che porta a un IQP bianco su d4.
    setup: ["d4", "Nf6", "c4", "e6", "Nc3", "Bb4", "e3", "O-O", "Bd3", "d5", "Nf3", "c5", "O-O", "dxc4", "Bxc4", "cxd4", "exd4", "Nc6"],
    line: ["Re1", "b6", "a3", "Bxc3", "bxc3"],
    exercise: {
      prompt:
        "Il Bianco ha l'isolano su d4. Trova una mossa coerente col piano: attività dei pezzi e pressione, NON la spinta affrettata. Cosa proponi?",
      planHint:
        "Con l'isolano si gioca per l'iniziativa: piazza i pezzi sulle case attive (Ce5, alfiere su d3 verso h7, torri su c1/e1) e prepara, al momento giusto, la rottura d4-d5 che libera l'isolano e apre il gioco. Evita i cambi che ti lascerebbero un finale con il pedone debole.",
      relatedTacticsTheme: "kingsideAttack",
      progressKey: "isolani_dama",
    },
    steps: [
      {
        at: 0,
        text: "Ecco la struttura tipica: il pedone d4 è isolato (niente pedoni c ed e). Dà al Bianco spazio e case attive, ma va sostenuto con i pezzi, mai cambiato in un finale.",
        shapes: [{ orig: "d4", brush: "blue" }],
      },
      {
        at: 1,
        text: "Le torri vanno sulle colonne semiaperte (c ed e) e i pezzi sulle case forti; l'idea a lungo termine è la rottura d4-d5 al momento giusto.",
      },
    ],
  },
  {
    slug: "colonna-aperta-e-settima-traversa",
    title: "Colonna aperta e settima traversa",
    summary: "Conquistare la colonna aperta, raddoppiare le torri, invadere in settima.",
    order: 1,
    intro:
      "Le torri vivono sulle colonne aperte. Chi conquista la colonna aperta (qui la colonna c, senza pedoni) e ci porta le torri minaccia l'INVASIONE in settima traversa, dove attacca i pedoni avversari e ne immobilizza i pezzi. Se possibile si raddoppiano le torri prima di invadere. (Bozza da revisione.)",
    // Posizione-tipo costruita a mano (ben formata, materialmente pari): colonna c aperta.
    setup: [],
    line: ["Rc5", "Rxc5", "dxc5"],
    exercise: {
      prompt:
        "La colonna c è aperta e le torri si fronteggiano. Trova un piano per il Bianco per sfruttare la colonna e puntare alla settima traversa.",
      planHint:
        "Contendi e conquista la colonna aperta: se il Nero la lascia, Tc7 invade la settima e attacca i pedoni. Se l'avversario resta, valuta i cambi che ti aprono la strada verso c7 e centralizza il re in vista del finale.",
      progressKey: "colonna_aperta",
    },
    steps: [
      {
        at: 0,
        text: "La colonna c è aperta: chi la controlla detta legge. La torre punta alla settima traversa (c7), dove i pedoni neri diventano bersagli.",
        shapes: [
          { orig: "c1", dest: "c8", brush: "blue" },
          { orig: "c7", brush: "green" },
        ],
      },
    ],
  },
  {
    slug: "case-deboli-e-avamposti",
    title: "Case deboli e avamposti",
    summary: "Creare e sfruttare un avamposto: il buon cavallo contro l'alfiere cattivo.",
    order: 2,
    intro:
      "Una casa debole è una casa che l'avversario non può più difendere con un pedone. Se è nella metà campo nemica e tu puoi sostenerla con un pedone, diventa un AVAMPOSTO: il posto ideale per un cavallo, che da lì domina senza poter essere scacciato. Qui il Bianco ha un avamposto eterno su d5 (struttura alla Sveshnikov). (Bozza da revisione.)",
    // Sveshnikov: porta all'avamposto bianco su d5 e all'alfiere nero «cattivo».
    setup: ["e4", "c5", "Nf3", "Nc6", "d4", "cxd4", "Nxd4", "Nf6", "Nc3", "e5", "Ndb5", "d6", "Bg5", "a6", "Na3", "b5", "Bxf6", "gxf6", "Nd5", "Bg7", "c3", "O-O"],
    line: ["Nc2", "Be6", "Nce3"],
    exercise: {
      prompt:
        "Il cavallo bianco domina l'avamposto d5, mentre il Nero ha una struttura indebolita. Trova un piano per consolidare e sfruttare il vantaggio posizionale.",
      planHint:
        "L'avamposto su d5 è eterno: nessun pedone nero può scacciarlo. Il piano bianco è consolidarlo (manovra Cb1-d2-f1-e3 o c3 + Cc2-e3) e giocare sulle case deboli; il cavallo forte vale più dell'alfiere nero, limitato dai propri pedoni. Punta ad aprire un secondo fronte mantenendo il blocco su d5.",
      progressKey: "avamposti",
    },
    steps: [
      {
        at: 0,
        text: "Il cavallo su d5 è un avamposto perfetto: nessun pedone nero può cacciarlo. È il classico «buon cavallo» contro l'alfiere nero, limitato dai propri pedoni.",
        shapes: [{ orig: "d5", brush: "green" }],
      },
      {
        at: 1,
        text: "Il Bianco non ha fretta: consolida l'avamposto e manovra i pezzi sulle case deboli del campo nero, dove il cavallo regna.",
      },
    ],
  },
];

const OPEN_FILE_FEN = "2r3k1/pp3ppp/4p3/3p4/3P4/4P3/PP3PPP/2R3K1 w - - 0 1";

// ──────────────────────────────── build ───────────────────────────────────

function lessonSteps(ids: string[], defs: { at: number; text: string; shapes?: Shape[] }[]): LessonStep[] {
  return defs.map((d) => {
    const nodeId = ids[Math.min(d.at, ids.length - 1)];
    return { nodeId, text: d.text, shapes: d.shapes };
  });
}

async function buildEndgame(seed: EndgameSeed) {
  const { tree, ids } = await optimalLine(seed.practice.fen, seed.maxPlies);
  const steps = lessonSteps(ids, seed.steps);
  for (const s of steps) {
    if (!tree.nodes[s.nodeId]) throw new Error(`Step verso nodo inesistente in ${seed.slug}`);
  }
  const lesson: Lesson & { practice: EndgamePractice } = {
    intro: seed.intro,
    tree: serializeTree(tree),
    steps,
    practice: seed.practice,
  };
  return {
    type: "endgame" as const,
    slug: seed.slug,
    title: seed.title,
    summary: seed.summary,
    order: seed.order,
    startFen: tree.nodes[tree.rootId].fen,
    linePgn: toPgn(tree),
    body: lesson,
  };
}

function buildMiddlegame(seed: MiddlegameSeed) {
  // Posizione-tipo: dalla scacchiera iniziale via `setup`, o FEN dedicata.
  let startFen: string;
  if (seed.setup.length > 0) {
    const chess = new Chess();
    for (const san of seed.setup) chess.move(san); // valida la legalità
    startFen = chess.fen();
  } else {
    startFen = OPEN_FILE_FEN;
  }
  const userColor: "white" | "black" = startFen.split(" ")[1] === "b" ? "black" : "white";

  let tree = createTree(startFen);
  const added = addLine(tree, tree.rootId, seed.line);
  tree = added.tree;
  const ids = [tree.rootId, ...added.ids];
  const steps = lessonSteps(ids, seed.steps);
  for (const s of steps) {
    if (!tree.nodes[s.nodeId]) throw new Error(`Step verso nodo inesistente in ${seed.slug}`);
  }
  const exercise: PositionalExercise = { fen: startFen, userColor, ...seed.exercise };
  const lesson: Lesson & { exercise: PositionalExercise } = {
    intro: seed.intro,
    tree: serializeTree(tree),
    steps,
    exercise,
  };
  return {
    type: "middlegame" as const,
    slug: seed.slug,
    title: seed.title,
    summary: seed.summary,
    order: seed.order,
    startFen,
    linePgn: toPgn(tree),
    body: lesson,
  };
}

interface Built {
  type: "endgame" | "middlegame";
  slug: string;
  title: string;
  summary: string;
  order: number;
  startFen: string;
  linePgn: string;
  body: unknown;
}

const q = (s: string) => s.replace(/'/g, "''");

function rowSql(b: Built): string {
  const body = q(JSON.stringify(b.body));
  return `(
  '${b.type}',
  '${q(b.title)}',
  '${b.slug}',
  '${q(b.summary)}',
  '${body}'::jsonb,
  '${b.startFen}',
  '${q(b.linePgn)}',
  ${b.order},
  true
)`;
}

async function main() {
  const built: Built[] = [];

  console.log("Genero i finali (linee ottimali dalla tablebase)…");
  for (const e of ENDGAMES) {
    const b = await buildEndgame(e);
    console.log(`  ✓ ${e.slug} — ${b.body && (b.body as Lesson).steps.length} passi, mainline: ${b.linePgn}`);
    built.push(b);
  }

  console.log("Genero i temi di mediogioco…");
  for (const m of MIDDLEGAMES) {
    const b = buildMiddlegame(m);
    console.log(`  ✓ ${m.slug} — FEN: ${b.startFen}`);
    built.push(b);
  }

  const values = built.map(rowSql).join(",\n");
  const sql = `-- 0007_theory_06c_seed.sql
-- Contenuti-vetrina del ramo Teoria (prompt 06c): 5 finali fondamentali + 3 temi
-- di mediogioco. Generato da scripts/seed-theory-06c.mts — idempotente sullo slug.
--
-- Correttezza: le linee dei FINALI sono il gioco ottimale di ENTRAMBI i lati
-- secondo la tablebase Lichess; le posizioni di pratica hanno esito verificato
-- (scripts/verify-endgames.mts). Mediogioco: posizioni/linee valide per legalità
-- con chess.js. Le spiegazioni in italiano sono BOZZE DA REVISIONE.

insert into content_items (type, title, slug, summary, body, start_fen, line_pgn, order_index, published)
values
${values}
on conflict (slug) do update set
  type = excluded.type,
  title = excluded.title,
  summary = excluded.summary,
  body = excluded.body,
  start_fen = excluded.start_fen,
  line_pgn = excluded.line_pgn,
  order_index = excluded.order_index,
  published = excluded.published;
`;

  const out = join(process.cwd(), "supabase", "migrations", "0007_theory_06c_seed.sql");
  await writeFile(out, sql, "utf8");
  console.log("\nScritto", out);
  console.log("Righe:", built.length);
}

await main();
