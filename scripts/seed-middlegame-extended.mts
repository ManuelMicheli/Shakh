/**
 * Estensione dei 3 temi di MEDIOGIOCO seminati da 0007 (scripts/seed-theory-06c.mts):
 * linee illustrative più lunghe (l'applicazione pratica del tema, non solo la
 * posizione-tipo) + piano "come continuare" (Lesson.plan). I finali NON sono
 * toccati: le loro linee sono già il gioco ottimale completo da tablebase.
 *
 *   npx tsx scripts/seed-middlegame-extended.mts
 *
 * Garanzie: posizioni e linee validate per LEGALITÀ con chess.js; le valutazioni
 * vere arrivano dal motore a runtime. Spiegazioni in italiano: BOZZE DA REVISIONE.
 * Output: supabase/migrations/0033_middlegame_extended_seed.sql (0007 resta storica).
 */
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Chess } from "chess.js";
import {
  createTree,
  addMove,
  serializeTree,
  toPgn,
  type MoveTree,
  type Shape,
} from "../src/lib/chess/moveTree.ts";
import type { Lesson, LessonStep } from "../src/lib/theory/types.ts";
import type { PositionalExercise } from "../src/lib/theory/middlegame.ts";

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

interface MiddlegameSeed {
  slug: string;
  title: string;
  summary: string;
  order: number;
  intro: string;
  setup: string[];
  line: string[];
  plan: string;
  exercise: Omit<PositionalExercise, "fen" | "userColor">;
  steps: { at: number; text: string; shapes?: Shape[] }[];
}

// Identici a 0007 per slug/title/summary/order/exercise; cambiano linea, passi e plan.
const MIDDLEGAMES: MiddlegameSeed[] = [
  {
    slug: "pedone-isolano-di-donna-iqp",
    title: "Il pedone isolano di donna (IQP)",
    summary: "Giocare con l'isolano (attività e attacco) e contro (bloccare, puntare al finale).",
    order: 0,
    intro:
      "L'isolano di donna (qui il pedone d4 bianco, senza pedoni c ed e a sostenerlo) è forza e debolezza insieme: dà spazio, caselle attive (e5, c5) e iniziativa per l'attacco, ma in un finale diventa un bersaglio. Chi ce l'ha gioca per l'ATTIVITÀ; chi lo affronta BLOCCA la casa davanti (d5) e punta ai cambi. La linea prosegue nel mediogioco fino al salto in e5: così vedi il piano in azione. (Bozza da revisione.)",
    setup: ["d4", "Nf6", "c4", "e6", "Nc3", "Bb4", "e3", "O-O", "Bd3", "d5", "Nf3", "c5", "O-O", "dxc4", "Bxc4", "cxd4", "exd4", "Nc6"],
    line: ["Re1", "b6", "a3", "Bxc3", "bxc3", "Bb7", "Bd3", "Rc8", "Qe2", "Na5", "Ne5", "Re8"],
    plan:
      "Con l'isolano: pezzi sulle case attive (Ce5 sostenuto da d4, alfiere verso h7, torri su c1/e1), pressione crescente sul re e, al momento giusto, la rottura d4-d5 che apre tutte le linee — l'isolano si trasforma in energia. Contro l'isolano: blocca d5 con un pezzo, cambia i pezzi minori attivi dell'avversario e porta la partita verso il finale: lì d4 diventa solo un pedone debole da assediare con torri e re.",
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
      {
        at: 7,
        text: "L'alfiere torna in d3: la batteria verso h7 è il primo dividendo dell'isolano — il Nero deve già badare al re, non solo al pedone d4.",
        shapes: [{ orig: "d3", dest: "h7", brush: "green" }],
      },
      {
        at: 11,
        text: "Ce5! Il cavallo salta sulla casa attiva sostenuta proprio dall'isolano: domina f7 e d7 e prepara sia l'attacco sia la rottura d4-d5. Questo è il mediogioco tipico dell'IQP.",
        shapes: [{ orig: "e5", brush: "green" }, { orig: "d4", dest: "d5", brush: "blue" }],
      },
      {
        at: 12,
        text: "Posizione di lavoro raggiunta: pezzi bianchi al massimo dell'attività contro struttura nera sana. Da qui valgono i piani descritti in «Come continuare» — provali contro il motore.",
      },
    ],
  },
  {
    slug: "colonna-aperta-e-settima-traversa",
    title: "Colonna aperta e settima traversa",
    summary: "Conquistare la colonna aperta, raddoppiare le torri, invadere in settima.",
    order: 1,
    intro:
      "Le torri vivono sulle colonne aperte. Chi conquista la colonna aperta (qui la colonna c, senza pedoni) e ci porta le torri minaccia l'INVASIONE in settima traversa, dove attacca i pedoni avversari e ne immobilizza i pezzi. Se possibile si raddoppiano le torri prima di invadere. La linea prosegue dopo il cambio: vedrai che il tema della colonna si trasforma nel tema del RE ATTIVO. (Bozza da revisione.)",
    setup: [],
    line: ["Rc5", "Rxc5", "dxc5", "Kf8", "Kf1", "Ke7", "Ke2", "Kd7", "Kd3", "Kc6", "Kd4"],
    plan:
      "Sulla colonna aperta il piano è in tre tempi: 1) contendi la colonna (mai cederla gratis); 2) se la conquisti, raddoppia e invadi la settima traversa, dove la torre mangia pedoni e lega i pezzi avversari; 3) se l'avversario contesta e i cambi sono inevitabili, scegli il cambio che ti lascia il FINALE migliore — qui dopo il cambio delle torri decide il re più attivo e la maggioranza di pedoni più mobile. La colonna aperta non è un fine: è la porta d'ingresso.",
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
      {
        at: 3,
        text: "Le torri si sono cambiate sulla colonna contesa: il Bianco ha guadagnato un pedone più avanzato (c5) che toglie spazio. Ora il tema cambia pelle: senza torri, decide il re.",
        shapes: [{ orig: "c5", brush: "green" }],
      },
      {
        at: 11,
        text: "Guarda la corsa dei re: chi centralizza prima comanda. Il re bianco in d4 difende c5, preme su d5 e tiene l'iniziativa: è la conversione naturale del vantaggio di colonna.",
        shapes: [{ orig: "d4", brush: "green" }],
      },
    ],
  },
  {
    slug: "case-deboli-e-avamposti",
    title: "Case deboli e avamposti",
    summary: "Creare e sfruttare un avamposto: il buon cavallo contro l'alfiere cattivo.",
    order: 2,
    intro:
      "Una casa debole è una casa che l'avversario non può più difendere con un pedone. Se è nella metà campo nemica e tu puoi sostenerla con un pedone, diventa un AVAMPOSTO: il posto ideale per un cavallo, che da lì domina senza poter essere scacciato. Qui il Bianco ha un avamposto eterno su d5 (struttura alla Sveshnikov). La linea prosegue fino in fondo al tema: anche se il Nero cambia TUTTO su d5, il problema non sparisce. (Bozza da revisione.)",
    setup: ["e4", "c5", "Nf3", "Nc6", "d4", "cxd4", "Nxd4", "Nf6", "Nc3", "e5", "Ndb5", "d6", "Bg5", "a6", "Na3", "b5", "Bxf6", "gxf6", "Nd5", "Bg7", "c3", "O-O"],
    line: ["Nc2", "Be6", "Nce3", "Ne7", "Bd3", "Nxd5", "Nxd5", "Bxd5", "exd5"],
    plan:
      "Il piano sull'avamposto ha due facce. Se il Nero NON cambia: consolida il cavallo (c3, Cc2-e3), apri un secondo fronte (a4 contro b5, oppure f4 al momento giusto) e lascia che il cavallo in d5 paralizzi la difesa. Se il Nero cambia tutto su d5: ricatturi col pedone e l'avamposto diventa un PEDONE PROTETTO e AVANZATO che taglia il campo nero in due, mentre l'alfiere di g7 resta murato dai propri pedoni e5/f6 — porti il re verso il finale e giochi contro l'alfiere cattivo. In entrambi i casi la casa debole resta debole: cambiare i pezzi non cura la struttura.",
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
      {
        at: 4,
        text: "Il Nero prova la cura classica: …Ce7 per cambiare il dominatore di d5. Nota la manovra bianca Ca3-c2-e3: TUTTI i cavalli convergono sulla casa debole.",
        shapes: [{ orig: "e7", dest: "d5", brush: "red" }],
      },
      {
        at: 9,
        text: "Il Nero ha cambiato cavallo e alfiere su d5, ma exd5! mostra la verità: l'avamposto è diventato un pedone protetto e avanzato che taglia in due il campo nero, e l'alfiere g7 resta murato da e5/f6. La debolezza strutturale sopravvive ai cambi.",
        shapes: [{ orig: "d5", brush: "green" }, { orig: "g7", brush: "red" }],
      },
    ],
  },
];

const OPEN_FILE_FEN = "2r3k1/pp3ppp/4p3/3p4/3P4/4P3/PP3PPP/2R3K1 w - - 0 1";

function lessonSteps(ids: string[], defs: { at: number; text: string; shapes?: Shape[] }[]): LessonStep[] {
  return defs.map((d) => {
    const nodeId = ids[Math.min(d.at, ids.length - 1)];
    return { nodeId, text: d.text, shapes: d.shapes };
  });
}

function buildMiddlegame(seed: MiddlegameSeed) {
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
    plan: seed.plan,
    exercise,
  };
  return {
    slug: seed.slug,
    title: seed.title,
    summary: seed.summary,
    order: seed.order,
    startFen,
    linePgn: toPgn(tree),
    body: lesson,
  };
}

const q = (s: string) => s.replace(/'/g, "''");

const built = MIDDLEGAMES.map(buildMiddlegame);
for (const b of built) console.log(`✓ ${b.slug} — ${b.linePgn}`);

const values = built
  .map(
    (b) => `(
  'middlegame',
  '${q(b.title)}',
  '${b.slug}',
  '${q(b.summary)}',
  '${q(JSON.stringify(b.body))}'::jsonb,
  '${b.startFen}',
  '${q(b.linePgn)}',
  ${b.order},
  true
)`,
  )
  .join(",\n");

const sql = `-- 0033_middlegame_extended_seed.sql
-- Temi di mediogioco con linee illustrative ESTESE (il piano in azione, non solo
-- la posizione-tipo) + piano "come continuare" (Lesson.plan). Aggiorna le righe
-- seminate da 0007 (stessi slug); i FINALI non sono toccati (linee tablebase già
-- complete). Generato da scripts/seed-middlegame-extended.mts — idempotente sullo
-- slug. Linee validate per legalità con chess.js. BOZZE DA REVISIONE.

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

const out = join(process.cwd(), "supabase", "migrations", "0033_middlegame_extended_seed.sql");
await writeFile(out, sql, "utf8");
console.log("Scritto", out);
