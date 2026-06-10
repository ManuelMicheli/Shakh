/**
 * Seed-vetrina del modulo Trappole (prompt 06d §6): ~10 trappole famose,
 * distribuite tra le categorie, col `body` in formato `Lesson` (06a).
 *
 * Pipeline e onestà sui contenuti:
 *  - le linee (SAN) sono VALIDATE con chess.js: la posizione-trigger è derivata
 *    rigiocando le mosse di setup dalla posizione iniziale; ogni mossa della
 *    trappola passa per `addMove` (rifiuta le illegali) e la mainline è asserita;
 *  - NIENTE valutazioni inventate (campo `evalCp` mai impostato);
 *  - le spiegazioni in italiano sono BOZZE DA REVISIONE, non verità definitiva.
 *
 * Nota di curation: il Greek Gift (Axh7+), pur citato come esempio, è un
 * sacrificio "sano" che NON ha una contromossa-sicura distinta → non si presta
 * alla modalità "evita". È quindi rimandato alla curation; qui i sacrifici sono
 * rappresentati da Fegato Fritto e Damiano. L'infrastruttura resta pronta per
 * aggiungerlo come trappola "solo viewer" in futuro.
 *
 *   npx tsx scripts/seed-traps.mts
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
  mainlineIds,
  type MoveTree,
  type Shape,
} from "../src/lib/chess/moveTree.ts";
import type { Lesson, LessonStep } from "../src/lib/theory/types.ts";

// ─────────────────────────────── Helpers di build ────────────────────────────

/** FEN dopo aver rigiocato le mosse di setup (chess.js valida ogni mossa). */
function fenAfter(setup: string[]): string {
  const c = new Chess();
  for (const san of setup) {
    const m = c.move(san); // lancia se illegale
    if (!m) throw new Error(`Setup illegale a ${san}`);
  }
  return c.fen();
}

/** Aggiunge una linea SAN a partire da `parentId`, ritorna l'ultimo nodeId. */
function addLine(tree: MoveTree, parentId: string, sans: string[]): { tree: MoveTree; lastId: string } {
  let parent = parentId;
  for (const san of sans) {
    const res = addMove(tree, parent, san);
    if (!res.nodeId) throw new Error(`Mossa illegale "${san}" da ${parent}`);
    tree = res.tree;
    parent = res.nodeId;
  }
  return { tree, lastId: parent };
}

/** Id del nodo raggiunto seguendo un percorso di SAN dalla radice. */
function findByPath(tree: MoveTree, sans: string[]): string {
  let cur = tree.nodes[tree.rootId];
  for (const san of sans) {
    const childId = cur.children.find((c) => tree.nodes[c].san === san);
    if (!childId) throw new Error(`Percorso assente: ${sans.join(" ")} (manca ${san})`);
    cur = tree.nodes[childId];
  }
  return cur.id;
}

function assertMainline(tree: MoveTree, expected: string[], label: string) {
  const got = mainlineIds(tree).map((i) => tree.nodes[i].san).filter(Boolean);
  if (got.join(" ") !== expected.join(" ")) {
    throw new Error(`[${label}] Mainline inattesa:\n  atteso:   ${expected.join(" ")}\n  ottenuto: ${got.join(" ")}`);
  }
}

interface Variation {
  /** SAN dalla radice fino al bivio (vuoto = alternative all'esca). */
  at: string[];
  /** Le mosse della variante. */
  sans: string[];
  /** Commento sull'ultimo nodo della variante. */
  comment?: string;
}

interface StepSpec {
  path: string[];
  text: string;
  shapes?: Shape[];
  highlightMoves?: string[];
}

interface TrapSpec {
  id: string;
  slug: string;
  name: string;
  category: string;
  fame: string;
  eco: string | null;
  opening: string | null;
  side: "white" | "black";
  motif: string[];
  level: number;
  intro: string;
  setup: string[];        // mosse dalla posizione iniziale → trigger
  mainline: string[];     // esca + scatto + seguito (dalla posizione-trigger)
  variations: Variation[];
  steps: StepSpec[];
  /** "Come continuare": conversione/piano dopo la trappola (Lesson.plan). */
  plan?: string;
}

interface BuiltTrap {
  spec: TrapSpec;
  triggerFen: string;
  lesson: Lesson;
  linePgn: string;
}

function build(spec: TrapSpec): BuiltTrap {
  const triggerFen = fenAfter(spec.setup);
  let tree = createTree(triggerFen);

  // Mainline (esca → scatto → seguito).
  ({ tree } = addLine(tree, tree.rootId, spec.mainline));
  assertMainline(tree, spec.mainline, spec.slug);

  // Varianti (alternative sicure e linee illustrative).
  for (const v of spec.variations) {
    const branchId = findByPath(tree, v.at);
    const { tree: t2, lastId } = addLine(tree, branchId, v.sans);
    tree = t2;
    if (v.comment) tree = annotateNode(tree, lastId, { comment: v.comment });
  }

  const steps: LessonStep[] = spec.steps.map((s) => {
    const nodeId = findByPath(tree, s.path);
    return { nodeId, text: s.text, shapes: s.shapes, highlightMoves: s.highlightMoves };
  });

  const lesson: Lesson = { intro: spec.intro, tree: serializeTree(tree), steps, plan: spec.plan };
  return { spec, triggerFen, lesson, linePgn: toPgn(tree) };
}

// ─────────────────────────────────── Trappole ────────────────────────────────

const SPECS: TrapSpec[] = [
  // 1. Matto di Légal
  {
    id: "11111111-06d0-4000-8000-000000000001",
    slug: "matto-di-legal",
    name: "Matto di Légal",
    category: "opening_trap",
    fame: "famous",
    eco: "C41",
    opening: "Difesa Philidor",
    side: "white",
    motif: ["sacrifice", "mate"],
    level: 1,
    intro: "Bozza da revisione. Il Matto di Légal: il Bianco sacrifica la donna con Cxe5, e se il Nero la prende arriva il matto col cavallo.",
    setup: ["e4", "e5", "Nf3", "Nc6", "Bc4", "d6", "Nc3", "Bg4", "Nxe5"],
    mainline: ["Bxd1", "Bxf7+", "Ke7", "Nd5#"],
    variations: [
      { at: [], sans: ["dxe5", "Qxg4"], comment: "Il Nero declina la donna e perde solo un pedone." },
    ],
    steps: [
      {
        path: ["Bxd1"],
        text: "L'esca: prendere la donna con Axd1 sembra vincere materiale, ma ignora la rete su f7.",
        shapes: [{ orig: "f7", brush: "red" }],
      },
      {
        path: ["Bxd1", "Bxf7+"],
        text: "Lo scatto: il sacrificio d'alfiere con scacco trascina il re allo scoperto.",
        shapes: [{ orig: "c4", dest: "f7", brush: "green" }],
      },
      {
        path: ["Bxd1", "Bxf7+", "Ke7", "Nd5#"],
        text: "Il seguito: Cd5 è matto — il cavallo in e5 toglie d7 e f7, l'alfiere copre la fuga.",
        shapes: [{ orig: "c3", dest: "d5", brush: "green" }],
      },
    ],
    plan: "La partita finisce qui: matto. Cosa portarti via: un pezzo che sembra «gratis» (la donna in d1) va sempre verificato contando le minacce sul proprio re — qui f7 era il vero campo di battaglia. Se l'avversario declina l'esca (…dxe5), recuperi l'alfiere con Dxg4 e giochi con un pedone in più e sviluppo migliore: sviluppa, arrocca e converti senza fretta.",
  },

  // 2. Fegato Fritto (Fried Liver)
  {
    id: "11111111-06d0-4000-8000-000000000002",
    slug: "fegato-fritto",
    name: "Fegato Fritto (Fried Liver)",
    category: "sacrifice",
    fame: "famous",
    eco: "C57",
    opening: "Difesa dei due cavalli",
    side: "white",
    motif: ["sacrifice", "fork", "attack"],
    level: 2,
    intro: "Bozza da revisione. Il Fegato Fritto: dopo 5...Cxd5 il Bianco sacrifica il cavallo in f7 e stana il re nero. La linea prosegue nell'attacco, così vedi come si continua davvero.",
    setup: ["e4", "e5", "Nf3", "Nc6", "Bc4", "Nf6", "Ng5", "d5", "exd5"],
    mainline: ["Nxd5", "Nxf7", "Kxf7", "Qf3+", "Ke6", "Nc3", "Nb4", "Qe4", "c6", "a3", "Na6", "d4"],
    variations: [
      { at: [], sans: ["Na5", "Bb5+", "c6", "dxc6", "bxc6"], comment: "La difesa corretta: 5...Ca5, non 5...Cxd5." },
    ],
    steps: [
      {
        path: ["Nxd5"],
        text: "L'esca: ricatturare in d5 è naturale, ma ora f7 è indifeso e sotto tiro doppio.",
        shapes: [{ orig: "g5", dest: "f7", brush: "red" }, { orig: "c4", dest: "f7", brush: "red" }],
        highlightMoves: ["Na5"],
      },
      {
        path: ["Nxd5", "Nxf7"],
        text: "Lo scatto: il sacrificio di cavallo su f7 — il Fegato Fritto — strappa il re dalla sua casa.",
      },
      {
        path: ["Nxd5", "Nxf7", "Kxf7", "Qf3+", "Ke6", "Nc3"],
        text: "Il seguito: con Df3+ e Cc3 il Bianco attacca il cavallo in d5 inchiodandolo al re scoperto; l'iniziativa vale il pezzo (bozza).",
      },
      {
        path: ["Nxd5", "Nxf7", "Kxf7", "Qf3+", "Ke6", "Nc3", "Nb4", "Qe4", "c6", "a3", "Na6", "d4"],
        text: "Come si continua: il Nero si aggrappa a d5 (…Cb4, …c6), il Bianco non ha fretta — a3 respinge, d4 apre il centro sul re in e6 e porta dentro anche l'alfiere c1. Ogni pezzo bianco entra nell'attacco prima di riscuotere.",
        shapes: [{ orig: "e6", brush: "red" }, { orig: "d2", dest: "d4", brush: "green" }],
      },
    ],
    plan: "Col Bianco l'attacco si gioca così: pezzi dentro (d4, Af4 o Ag5, 0-0-0 o 0-0 con Te1), MAI cambi che alleggeriscano la difesa, e il re nero inchiodato al centro. Il materiale tornerà da solo: il Nero per sopravvivere dovrà restituire il pezzo, e spesso di più. Col Nero, se sei finito qui: restituisci subito il pezzo per portare il re al sicuro — tenere tutto e morire con +1 di materiale non è un piano.",
  },

  // 3. Trappola di Lasker (Controgambetto Albin)
  {
    id: "11111111-06d0-4000-8000-000000000003",
    slug: "trappola-di-lasker-albin",
    name: "Trappola di Lasker (Albin)",
    category: "gambit",
    fame: "known",
    eco: "D08",
    opening: "Controgambetto Albin",
    side: "black",
    motif: ["underPromotion", "sacrifice", "skewer"],
    level: 3,
    intro: "Bozza da revisione. La trappola di Lasker nell'Albin: una sottopromozione a cavallo capovolge la partita e vince la donna.",
    setup: ["d4", "d5", "c4", "e5", "dxe5", "d4", "e3", "Bb4+", "Bd2", "dxe3"],
    mainline: ["Bxb4", "exf2+", "Ke2", "fxg1=N+", "Rxg1", "Bg4+", "Ke1", "Bxd1", "Nc3", "Bh5", "Nd5", "Na6"],
    variations: [
      { at: [], sans: ["fxe3"], comment: "Il recupero corretto: 6.fxe3, evitando la trappola." },
      { at: ["Bxb4", "exf2+"], sans: ["Kxf2", "Qxd1"], comment: "6...exf2+ 7.Rxf2? Dxd1 sulla colonna d aperta." },
    ],
    steps: [
      {
        path: ["Bxb4"],
        text: "L'esca: ricatturare l'alfiere con Axb4 sembra ovvio, ma la colonna d aperta e il pedone in e3 nascondono una rete.",
      },
      {
        path: ["Bxb4", "exf2+", "Ke2", "fxg1=N+"],
        text: "Lo scatto: la sottopromozione a cavallo con scacco! Una donna non darebbe scacco e perderebbe il colpo.",
        shapes: [{ orig: "f2", dest: "g1", brush: "green" }],
      },
      {
        path: ["Bxb4", "exf2+", "Ke2", "fxg1=N+", "Rxg1", "Bg4+"],
        text: "Il seguito: Ag4+ infila re e donna sulla diagonale — il Nero vince la donna.",
        shapes: [{ orig: "g4", dest: "e2", brush: "green" }],
      },
      {
        path: ["Bxb4", "exf2+", "Ke2", "fxg1=N+", "Rxg1", "Bg4+", "Ke1", "Bxd1", "Nc3", "Bh5", "Nd5", "Na6"],
        text: "Come si continua: nota che il Bianco non può nemmeno riprendere in d1 (la donna in d8 difende lungo la colonna aperta!). Il Nero mette in salvo l'alfiere (…Ah5), para le ultime minacce (…Ca6 copre c7) e resta con la donna in più: da lì è pura tecnica.",
      },
    ],
    plan: "Hai donna contro alfiere e poco altro: la regola è ATTIVARE, non arraffare. Sviluppa tutti i pezzi, metti il re al sicuro e usa la donna per creare doppie minacce continue: con il re bianco bloccato al centro, ogni scacco o attacco doppio raccoglie materiale o forza cambi favorevoli. Evita solo di muovere la donna dieci volte mentre l'avversario si sviluppa.",
  },

  // 4. Gambetto dello scellino di Blackburne
  {
    id: "11111111-06d0-4000-8000-000000000004",
    slug: "blackburne-shilling-gambit",
    name: "Gambetto dello scellino di Blackburne",
    category: "gambit",
    fame: "famous",
    eco: "C50",
    opening: "Partita Italiana",
    side: "black",
    motif: ["sacrifice", "fork", "mate"],
    level: 2,
    intro: "Bozza da revisione. Il Blackburne Shilling Gambit: se il Bianco abbocca a 4.Cxe5, arriva un matto soffocato lampo.",
    setup: ["e4", "e5", "Nf3", "Nc6", "Bc4", "Nd4"],
    mainline: ["Nxe5", "Qg5", "Nxf7", "Qxg2", "Rf1", "Qxe4+", "Be2", "Nf3#"],
    variations: [
      { at: [], sans: ["Nxd4", "exd4"], comment: "La confutazione: 4.Cxd4, e il Bianco sta semplicemente bene." },
    ],
    steps: [
      {
        path: ["Nxe5"],
        text: "L'esca: il pedone e5 sembra gratis, ma il cavallo in d4 e la donna pronta a g5 preparano un agguato.",
      },
      {
        path: ["Nxe5", "Qg5"],
        text: "Lo scatto: Dg5! minaccia insieme il cavallo in e5 e il pedone g2 — il Bianco è già perso.",
        shapes: [{ orig: "g5", dest: "e5", brush: "green" }, { orig: "g5", dest: "g2", brush: "green" }],
      },
      {
        path: ["Nxe5", "Qg5", "Nxf7", "Qxg2", "Rf1", "Qxe4+", "Be2", "Nf3#"],
        text: "Il seguito: dopo Dxg2, Tf1, Dxe4+ e Ae2, arriva Cf3 matto soffocato.",
      },
    ],
    plan: "La partita finisce qui: matto soffocato. Cosa portarti via: il pedone e5 era avvelenato perché 4.Cxe5 lascia g2 ed e4 senza difensori contro Dg5. Se invece il Bianco gioca la confutazione 4.Cxd4 (vedi variante), col Nero non insistere: dopo exd4 sviluppa normalmente — hai solo una posizione un po' peggiore, non una trappola.",
  },

  // 5. Fishing Pole (Canna da pesca)
  {
    id: "11111111-06d0-4000-8000-000000000005",
    slug: "fishing-pole",
    name: "Trappola della canna da pesca",
    category: "opening_trap",
    fame: "known",
    eco: "C65",
    opening: "Spagnola, Difesa Berlinese",
    side: "black",
    motif: ["sacrifice", "attack", "mate"],
    level: 2,
    intro: "Bozza da revisione. La «canna da pesca»: il cavallo in g4 è l'esca; se il Bianco lo prende, la colonna h si apre sul suo re.",
    setup: ["e4", "e5", "Nf3", "Nc6", "Bb5", "Nf6", "O-O", "Ng4", "h3", "h5"],
    mainline: ["hxg4", "hxg4", "Ne1", "Qh4", "g3", "Qh3"],
    variations: [
      { at: [], sans: ["d3"], comment: "Non abbocca: meglio lasciar stare il cavallo in g4." },
    ],
    steps: [
      {
        path: ["hxg4"],
        text: "L'esca: il cavallo in g4 sembra in presa, ma catturarlo apre la colonna h verso il tuo re.",
      },
      {
        path: ["hxg4", "hxg4"],
        text: "Lo scatto: con la colonna h spalancata, il cavallo f3 deve fuggire e il re bianco resta esposto.",
        shapes: [{ orig: "h8", dest: "h1", brush: "green" }],
      },
      {
        path: ["hxg4", "hxg4", "Ne1", "Qh4"],
        text: "Il seguito: Dh4 minaccia Dh1 matto, sostenuta dalla torre h8 sulla colonna aperta.",
        shapes: [{ orig: "h4", dest: "h1", brush: "green" }],
      },
      {
        path: ["hxg4", "hxg4", "Ne1", "Qh4", "g3", "Qh3"],
        text: "Come si continua: g3 caccia la donna ma Dh3 rientra e il matto in h1 resta in canna. Il Bianco può solo gettare pezzi sulla colonna h per ritardare: la batteria donna+torre sulla colonna aperta decide.",
        shapes: [{ orig: "h3", dest: "h1", brush: "green" }, { orig: "h8", dest: "h3", brush: "green" }],
      },
    ],
    plan: "Lo schema da ricordare: la trappola non vince materiale, vince una COLONNA APERTA sul re. La batteria Dh4/Dh3 + Th8 sfrutta il fatto che nessun pezzo bianco difende h1. Se il Bianco non abbocca (10.d3), il Nero ritira il cavallo (…Cf6) e ha comunque una partita normale con idee d'attacco sul lato di re: g5-g4 resta un piano.",
  },

  // 6. Elephant Trap (Trappola dell'elefante)
  {
    id: "11111111-06d0-4000-8000-000000000006",
    slug: "elephant-trap",
    name: "Trappola dell'elefante",
    category: "opening_trap",
    fame: "known",
    eco: "D51",
    opening: "Gambetto di donna rifiutato",
    side: "black",
    motif: ["pin", "fork"],
    level: 2,
    intro: "Bozza da revisione. La trappola dell'elefante nel QGD: se il Bianco prende il pedone in d5, perde un pezzo per un pedone.",
    setup: ["d4", "d5", "c4", "e6", "Nc3", "Nf6", "Bg5", "Nbd7", "cxd5", "exd5"],
    mainline: ["Nxd5", "Nxd5", "Bxd8", "Bb4+", "Qd2", "Bxd2+", "Kxd2", "Kxd8", "Nf3", "c6", "e3", "N7f6", "Bd3", "Bg4"],
    variations: [
      { at: [], sans: ["e3"], comment: "Lo sviluppo tranquillo, senza cadere nella trappola." },
    ],
    steps: [
      {
        path: ["Nxd5"],
        text: "L'esca: il pedone d5 sembra una cattura gratis, ma il cavallo in d7 cela la trappola.",
      },
      {
        path: ["Nxd5", "Nxd5", "Bxd8"],
        text: "Lo scatto: dopo Cxd5 il Bianco abbocca con Axd8 prendendo la donna…",
      },
      {
        path: ["Nxd5", "Nxd5", "Bxd8", "Bb4+", "Qd2", "Bxd2+", "Kxd2", "Kxd8"],
        text: "Il seguito: …ma Ab4+! Dd2 Axd2+ Rxd2 Rxd8 recupera la donna restando con un pezzo in più.",
      },
      {
        path: ["Nxd5", "Nxd5", "Bxd8", "Bb4+", "Qd2", "Bxd2+", "Kxd2", "Kxd8", "Nf3", "c6", "e3", "N7f6", "Bd3", "Bg4"],
        text: "Come si continua: niente magie, tecnica. Il Nero puntella d5 con c6, riporta fuori i pezzi (…C7f6, …Ag4 con minaccia) e va verso un finale con un pezzo in più: ogni cambio di pezzi lo avvicina alla vittoria.",
      },
    ],
    plan: "Con un pezzo in più e le donne già fuori dalla scacchiera, il piano è da manuale: consolida (c6), sviluppa, metti il re al sicuro e CERCA i cambi di pezzi (non di pedoni). Ogni cambio rende il vantaggio materiale più pesante; nel finale il pezzo in più decide da solo. L'unico modo per buttare via questa posizione è giocare d'attacco invece che di tecnica.",
  },

  // 7. Trappola di Mortimer
  {
    id: "11111111-06d0-4000-8000-000000000007",
    slug: "trappola-di-mortimer",
    name: "Trappola di Mortimer",
    category: "opening_trap",
    fame: "niche",
    eco: "C65",
    opening: "Spagnola, Difesa di Mortimer",
    side: "black",
    motif: ["fork"],
    level: 3,
    intro: "Bozza da revisione. La trappola di Mortimer: lo strano 4...Ce7 invita il Bianco a prendere e5, ma è una forchetta in agguato.",
    setup: ["e4", "e5", "Nf3", "Nc6", "Bb5", "Nf6", "d3", "Ne7"],
    mainline: ["Nxe5", "c6", "Bc4", "Qa5+", "Nc3", "Qxe5", "d4", "Qd6", "O-O", "Ng6"],
    variations: [
      { at: [], sans: ["O-O"], comment: "Meglio non prendere e5: lo sviluppo tranquillo." },
    ],
    steps: [
      {
        path: ["Nxe5"],
        text: "L'esca: e5 sembra un pedone gratis dopo lo strano Ce7, ma è proprio l'invito della trappola.",
      },
      {
        path: ["Nxe5", "c6", "Bc4", "Qa5+"],
        text: "Lo scatto: c6 scaccia l'alfiere e poi Da5+ inforchetta re e cavallo in e5.",
        shapes: [{ orig: "a5", dest: "e5", brush: "green" }, { orig: "a5", dest: "e1", brush: "green" }],
      },
      {
        path: ["Nxe5", "c6", "Bc4", "Qa5+", "Nc3", "Qxe5"],
        text: "Il seguito: il Nero recupera il cavallo con Dxe5, restando con un pezzo in più.",
      },
      {
        path: ["Nxe5", "c6", "Bc4", "Qa5+", "Nc3", "Qxe5", "d4", "Qd6", "O-O", "Ng6"],
        text: "Come si continua: il Bianco guadagna qualche tempo sulla donna (d4) e sviluppa, ma il Nero ritira la donna in d6, riporta il cavallo in gioco (…Cg6) e completa lo sviluppo: il pezzo in più resta, l'attacco bianco no.",
      },
    ],
    plan: "Il Nero ha vinto un pezzo per un pedone ma la donna è uscita presto: il piano è ritirarla in una casa stabile (d6/e7), sviluppare in fretta (…Cg6, …Ae7, arrocco) e NON prendere altri pedoni. Lascia sfogare i tempi d'attacco del Bianco, cambia i pezzi quando puoi e porta la partita in un mediogioco calmo: lì il pezzo in più parla da solo.",
  },

  // 8. Trappola del Gambetto Englund
  {
    id: "11111111-06d0-4000-8000-000000000008",
    slug: "gambetto-englund",
    name: "Trappola del Gambetto Englund",
    category: "gambit",
    fame: "famous",
    eco: "A40",
    opening: "Gambetto Englund",
    side: "black",
    motif: ["pin", "mate"],
    level: 2,
    intro: "Bozza da revisione. La trappola dell'Englund: la donna nera razzia in b2 e, se il Bianco gioca Ac3, scatta un matto in fondo.",
    setup: ["d4", "e5", "dxe5", "Nc6", "Nf3", "Qe7", "Bf4", "Qb4+", "Bd2", "Qxb2"],
    mainline: ["Bc3", "Bb4", "Qd2", "Bxc3", "Qxc3", "Qc1#"],
    variations: [
      { at: [], sans: ["Nc3"], comment: "Difende b2 e a1 senza cadere: 6.Cc3." },
    ],
    steps: [
      {
        path: ["Bc3"],
        text: "L'esca: Ac3 attacca la donna in b2 e sembra intrappolarla, ma è il Bianco a finire in trappola.",
      },
      {
        path: ["Bc3", "Bb4"],
        text: "Lo scatto: Ab4! inchioda l'alfiere c3 contro il re — non può più catturare la donna.",
        shapes: [{ orig: "b4", dest: "e1", brush: "green" }],
      },
      {
        path: ["Bc3", "Bb4", "Qd2", "Bxc3", "Qxc3", "Qc1#"],
        text: "Il seguito: Axc3, Dxc3 e Dc1 è matto — il re bianco è soffocato dai propri pezzi.",
      },
    ],
    plan: "La partita finisce qui: matto in c1. Cosa portarti via: la donna in b2 NON era imprendibile — era un'esca che funzionava solo perché Ac3 si inchioda da solo. Col Bianco la mossa giusta era 6.Cc3: difende b2 e a1 sviluppando; dopo, il Bianco resta con un sano pedone in più e il Nero deve dimostrare il compenso del gambetto.",
  },

  // 9. Trappola di Kieninger (Gambetto di Budapest)
  {
    id: "11111111-06d0-4000-8000-000000000009",
    slug: "trappola-kieninger-budapest",
    name: "Trappola di Kieninger (Budapest)",
    category: "opening_trap",
    fame: "known",
    eco: "A52",
    opening: "Gambetto di Budapest",
    side: "black",
    motif: ["smotheredMate", "pin"],
    level: 3,
    intro: "Bozza da revisione. La trappola di Kieninger nel Budapest: 6.Cbd2? porta a un matto soffocato in d3 grazie all'inchiodatura su e2.",
    setup: ["d4", "Nf6", "c4", "e5", "dxe5", "Ng4", "Bf4", "Nc6", "Nf3", "Bb4+"],
    mainline: ["Nbd2", "Qe7", "a3", "Ngxe5", "axb4", "Nd3#"],
    variations: [
      { at: [], sans: ["Nc3"], comment: "Il blocco corretto: 6.Cc3, e niente trappola." },
    ],
    steps: [
      {
        path: ["Nbd2"],
        text: "L'esca: bloccare lo scacco con Cbd2 è naturale, ma lascia il re intrappolato dai propri pezzi.",
      },
      {
        path: ["Nbd2", "Qe7", "a3", "Ngxe5"],
        text: "Lo scatto: la donna in e7 inchioda il pedone e2; Cgxe5 prepara il colpo finale.",
        shapes: [{ orig: "e7", dest: "e2", brush: "green" }],
      },
      {
        path: ["Nbd2", "Qe7", "a3", "Ngxe5", "axb4", "Nd3#"],
        text: "Il seguito: Cd3 è matto — il pedone e2, inchiodato dalla donna, non può catturare il cavallo.",
        shapes: [{ orig: "e5", dest: "d3", brush: "green" }],
      },
    ],
    plan: "La partita finisce qui: matto in d3. Cosa portarti via: nel Budapest il pedone e5 si recupera quasi sempre, ma l'ordine di mosse conta — 6.Cbd2? si lega da solo, 6.Cc3 no. Col Nero, se il Bianco difende bene, il piano resta sano: …Cgxe5, sviluppo rapido e pressione su c4/e3; giochi una posizione attiva alla pari, non una trappola fallita.",
  },

  // 10. Difesa Damiano (confutazione/sacrificio)
  {
    id: "11111111-06d0-4000-8000-000000000010",
    slug: "difesa-damiano",
    name: "Difesa Damiano (la confutazione)",
    category: "sacrifice",
    fame: "known",
    eco: "C40",
    opening: "Difesa Damiano",
    side: "white",
    motif: ["sacrifice", "attack", "mate"],
    level: 2,
    intro: "Bozza da revisione. La Damiano (2...f6) è una delle mosse peggiori: il Bianco sacrifica in e5 e ottiene un attacco vincente.",
    setup: ["e4", "e5", "Nf3"],
    mainline: ["f6", "Nxe5", "fxe5", "Qh5+", "Ke7", "Qxe5+", "Kf7", "Bc4+", "Kg6", "Qf5+", "Kh6", "d4+", "g5", "h4"],
    variations: [
      { at: [], sans: ["Nc6"], comment: "La mossa sana: difendere e5 con un pezzo, non con …f6." },
      { at: ["f6", "Nxe5", "fxe5", "Qh5+", "Ke7", "Qxe5+", "Kf7", "Bc4+"], sans: ["d5", "Bxd5+", "Kg6"], comment: "Anche restituendo con …d5 il re resta in mezzo alla tempesta." },
    ],
    steps: [
      {
        path: ["f6"],
        text: "L'esca: difendere e5 con …f6 indebolisce il re e la diagonale verso e8 — è la Difesa Damiano.",
        shapes: [{ orig: "d1", dest: "h5", brush: "red" }],
      },
      {
        path: ["f6", "Nxe5"],
        text: "Lo scatto: Cxe5! Se il Nero prende (…fxe5) arriva Dh5+ con attacco furioso.",
      },
      {
        path: ["f6", "Nxe5", "fxe5", "Qh5+", "Ke7", "Qxe5+", "Kf7", "Bc4+"],
        text: "Il seguito: Dxe5+ e Ac4+ scatenano un attacco vincente sul re scoperto (bozza: vantaggio bianco netto).",
      },
      {
        path: ["f6", "Nxe5", "fxe5", "Qh5+", "Ke7", "Qxe5+", "Kf7", "Bc4+", "Kg6", "Qf5+", "Kh6", "d4+", "g5", "h4"],
        text: "Come si continua: il re nero viene trascinato fino in h6; d4+ apre lo scacco di scoperta dell'alfiere c1 e h4 minaccia di sfondare su g5. Nota il metodo: ogni mossa bianca dà scacco o crea una minaccia, il Nero non respira mai.",
        shapes: [{ orig: "c1", dest: "h6", brush: "green" }, { orig: "h4", dest: "g5", brush: "red" }],
      },
    ],
    plan: "Il metodo d'attacco da ricordare: re avversario allo scoperto = niente pause. Scacchi e minacce che SVILUPPANO (Ac4+, d4+ che porta dentro l'alfiere c1, h4 che apre la torre h1) valgono più dei pedoni catturati. Se il Nero restituisce materiale per respirare, prendilo solo quando non rallenta l'attacco: la donna nera ferma in d8 è il segnale che puoi continuare a spingere.",
  },
];

// ─────────────────────────────────── Genera SQL ──────────────────────────────

const q = (v: string | null): string => (v === null ? "null" : `'${v.replace(/'/g, "''")}'`);
/** JSON con a-capo dopo ogni "}," strutturale (mai dentro le stringhe): righe corte, jsonb identico. */
const wrapJson = (s: string): string =>
  s.replace(/("(?:[^"\\]|\\.)*")|},/g, (m, str) => (str !== undefined ? str : "},\n"));
const jb = (obj: unknown): string => `'${wrapJson(JSON.stringify(obj)).replace(/'/g, "''")}'::jsonb`;
const arr = (xs: string[]): string =>
  xs.length === 0 ? "'{}'::text[]" : `array[${xs.map((x) => q(x)).join(", ")}]::text[]`;

const built = SPECS.map(build);

const rows = built
  .map(({ spec, triggerFen, lesson, linePgn }) => {
    const cells = [
      q(spec.id),
      q(spec.slug),
      q(spec.name),
      q(spec.category),
      q(spec.fame),
      q(spec.eco),
      q(spec.opening),
      q(spec.side),
      arr(spec.motif),
      String(spec.level),
      q(triggerFen),
      q(linePgn),
      jb(lesson),
      "true",
    ];
    return `  (${cells.join(", ")})`;
  })
  .join(",\n");

const cols =
  "id, slug, name, category, fame, eco_code, opening_name, side, motif, level, trigger_fen, line_pgn, body, published";

const sql = `-- 0032_traps_extended_seed.sql
-- Trappole-vetrina con SEGUITO ESTESO (conversione/attacco dopo la trappola)
-- e piano "come continuare" (Lesson.plan). Aggiorna le righe seminate da 0008
-- (stessi slug; il batch 2 di 0029_traps_seed2 non è toccato). Pipeline
-- motore-verificata: linee validate da chess.js (vedi scripts/seed-traps.mts).
-- Contenuti marcati BOZZA DA REVISIONE. Idempotente sullo slug.

insert into traps (${cols})
values
${rows}
on conflict (slug) do update set
  name = excluded.name,
  category = excluded.category,
  fame = excluded.fame,
  eco_code = excluded.eco_code,
  opening_name = excluded.opening_name,
  side = excluded.side,
  motif = excluded.motif,
  level = excluded.level,
  trigger_fen = excluded.trigger_fen,
  line_pgn = excluded.line_pgn,
  body = excluded.body,
  published = excluded.published;
`;

const out = join(process.cwd(), "supabase", "migrations", "0032_traps_extended_seed.sql");
await writeFile(out, sql, "utf8");
console.log("Scritto", out);
for (const b of built) {
  console.log(`✓ ${b.spec.slug}: ${b.linePgn}`);
}
