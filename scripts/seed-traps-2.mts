/**
 * Secondo batch del modulo Trappole: +10 trappole famose (0029).
 *
 * Stessa pipeline motore-verificata di scripts/seed-traps.mts:
 *  - posizione-trigger derivata rigiocando il setup con chess.js;
 *  - ogni mossa passa per `addMove` (rifiuta le illegali);
 *  - la mainline è asserita sul SAN canonico di chess.js — quindi anche i
 *    matti dichiarati (#) sono verificati, non promessi;
 *  - NIENTE valutazioni inventate; prose in italiano BOZZA DA REVISIONE.
 *
 * Novità rispetto alla 0008: emette anche le colonne bilingui della 0021
 * (name_it/name_en, opening_name_it/opening_name_en).
 *
 *   npx tsx scripts/seed-traps-2.mts
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

function fenAfter(setup: string[]): string {
  const c = new Chess();
  for (const san of setup) {
    const m = c.move(san);
    if (!m) throw new Error(`Setup illegale a ${san}`);
  }
  return c.fen();
}

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
  at: string[];
  sans: string[];
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
  nameIt: string;
  nameEn: string;
  category: string;
  fame: string;
  eco: string | null;
  openingIt: string | null;
  openingEn: string | null;
  side: "white" | "black";
  motif: string[];
  level: number;
  intro: string;
  setup: string[];
  mainline: string[];
  variations: Variation[];
  steps: StepSpec[];
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

  ({ tree } = addLine(tree, tree.rootId, spec.mainline));
  assertMainline(tree, spec.mainline, spec.slug);

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

  const lesson: Lesson = { intro: spec.intro, tree: serializeTree(tree), steps };
  return { spec, triggerFen, lesson, linePgn: toPgn(tree) };
}

// ─────────────────────────────────── Trappole ────────────────────────────────

const SPECS: TrapSpec[] = [
  // 1. Arca di Noè (Spagnola)
  {
    id: "22222222-06d0-4000-8000-000000000001",
    slug: "arca-di-noe",
    nameIt: "Arca di Noè",
    nameEn: "Noah's Ark Trap",
    category: "opening_trap",
    fame: "famous",
    eco: "C70",
    openingIt: "Spagnola (Ruy Lopez)",
    openingEn: "Ruy Lopez",
    side: "black",
    motif: ["trappedPiece"],
    level: 1,
    intro:
      "Bozza da revisione. L'Arca di Noè: nella Spagnola la catena a6-b5-c4 imprigiona l'alfiere bianco in b3. " +
      "Se il Bianco ricattura in d4 con la donna, i pedoni neri si chiudono come un'arca.",
    setup: ["e4", "e5", "Nf3", "Nc6", "Bb5", "a6", "Ba4", "d6", "d4", "b5", "Bb3", "Nxd4", "Nxd4", "exd4"],
    mainline: ["Qxd4", "c5", "Qd5", "Be6", "Qc6+", "Bd7", "Qd5", "c4"],
    variations: [
      { at: [], sans: ["Bd5"], comment: "La precauzione: l'alfiere esce dalla gabbia prima che si chiuda." },
    ],
    steps: [
      {
        path: ["Qxd4"],
        text: "L'esca: ricatturare il pedone con la donna sembra naturale, ma lascia l'alfiere in b3 senza via di fuga.",
        shapes: [{ orig: "b3", brush: "red" }],
      },
      {
        path: ["Qxd4", "c5", "Qd5", "Be6", "Qc6+", "Bd7", "Qd5"],
        text: "La donna balla tra le minacce, ma il vero bersaglio è un altro: guarda i pedoni dell'ala di donna.",
        shapes: [{ orig: "a6", brush: "green" }, { orig: "b5", brush: "green" }, { orig: "c5", brush: "green" }],
      },
      {
        path: ["Qxd4", "c5", "Qd5", "Be6", "Qc6+", "Bd7", "Qd5", "c4"],
        text: "Lo scatto: ...c4! chiude l'arca. L'alfiere in b3 è intrappolato dai suoi stessi pedoni (a2, c2) e cadrà.",
        shapes: [{ orig: "c4", dest: "b3", brush: "green" }],
      },
    ],
  },

  // 2. Trappola Siberiana (Smith-Morra)
  {
    id: "22222222-06d0-4000-8000-000000000002",
    slug: "trappola-siberiana",
    nameIt: "Trappola Siberiana",
    nameEn: "Siberian Trap",
    category: "gambit",
    fame: "known",
    eco: "B21",
    openingIt: "Gambetto Smith-Morra",
    openingEn: "Smith-Morra Gambit",
    side: "black",
    motif: ["mate", "deflection", "fork"],
    level: 2,
    intro:
      "Bozza da revisione. La trappola Siberiana contro lo Smith-Morra: la batteria Dc7+Cg4 punta h2; " +
      "il naturale h3? viene punito da Cd4!, che devia i difensori e porta al matto in h2.",
    setup: ["e4", "c5", "d4", "cxd4", "c3", "dxc3", "Nxc3", "Nc6", "Nf3", "e6", "Bc4", "Qc7", "O-O", "Nf6", "Qe2", "Ng4"],
    mainline: ["h3", "Nd4", "Nxd4", "Qh2#"],
    variations: [
      { at: [], sans: ["Nb5"], comment: "La reazione giusta: mette in domanda la donna ed evita la rete su h2." },
      { at: ["h3", "Nd4"], sans: ["hxg4", "Nxe2+", "Nxe2"], comment: "Anche così il Nero vince la donna per un cavallo." },
    ],
    steps: [
      {
        path: ["h3"],
        text: "L'esca: h3 «caccia» il cavallo, ma indebolisce h2 proprio mentre donna e cavallo lo fissano.",
        shapes: [{ orig: "c7", dest: "h2", brush: "red" }, { orig: "g4", dest: "h2", brush: "red" }],
      },
      {
        path: ["h3", "Nd4"],
        text: "Lo scatto: Cd4!! attacca donna e cavallo insieme. Qualunque cattura abbandona la difesa di h2.",
        shapes: [{ orig: "d4", dest: "e2", brush: "green" }, { orig: "d4", dest: "f3", brush: "green" }],
      },
      {
        path: ["h3", "Nd4", "Nxd4", "Qh2#"],
        text: "Il seguito: Dh2 è matto — sostenuta dal cavallo in g4, con la torre f1 che toglie l'unica fuga al re.",
      },
    ],
  },

  // 3. Matto del Barbiere (Scholar's Mate) — e come si para
  {
    id: "22222222-06d0-4000-8000-000000000003",
    slug: "matto-del-barbiere",
    nameIt: "Matto del Barbiere",
    nameEn: "Scholar's Mate",
    category: "opening_trap",
    fame: "famous",
    eco: "C20",
    openingIt: "Partita di Pedone di Re",
    openingEn: "King's Pawn Game",
    side: "white",
    motif: ["mate", "attackingF2F7"],
    level: 0,
    intro:
      "Bozza da revisione. Il Matto del Barbiere: donna e alfiere puntano f7 per il matto in quattro mosse. " +
      "Devi conoscerlo nei due sensi: per non subirlo mai e per capire perché non funziona contro chi si difende bene.",
    setup: ["e4", "e5", "Qh5", "Nc6", "Bc4"],
    mainline: ["Nf6", "Qxf7#"],
    variations: [
      { at: [], sans: ["g6", "Qf3", "Nf6"], comment: "La difesa corretta: g6 respinge la donna e poi lo sviluppo punisce le sue perdite di tempo." },
    ],
    steps: [
      {
        path: [],
        text: "La minaccia: donna in h5 e alfiere in c4 convergono su f7, la casa difesa solo dal re.",
        shapes: [{ orig: "h5", dest: "f7", brush: "red" }, { orig: "c4", dest: "f7", brush: "red" }],
        highlightMoves: ["g6", "Nf6"],
      },
      {
        path: ["Nf6"],
        text: "L'esca: Cf6 attacca la donna ma NON para la minaccia su f7. È l'errore classico del principiante.",
      },
      {
        path: ["Nf6", "Qxf7#"],
        text: "Il seguito: Dxf7 è matto, sostenuta dall'alfiere c4. La parata giusta era g6 (vedi variante).",
      },
    ],
  },

  // 4. Matto soffocato della Caro-Kann
  {
    id: "22222222-06d0-4000-8000-000000000004",
    slug: "matto-soffocato-caro-kann",
    nameIt: "Matto soffocato della Caro-Kann",
    nameEn: "Caro-Kann Smothered Mate",
    category: "opening_trap",
    fame: "famous",
    eco: "B17",
    openingIt: "Difesa Caro-Kann",
    openingEn: "Caro-Kann Defense",
    side: "white",
    motif: ["smotheredMate", "pin"],
    level: 1,
    intro:
      "Bozza da revisione. La miniatura più famosa della Caro-Kann: dopo 5.De2, lo sviluppo «naturale» " +
      "5...Cgf6?? permette 6.Cd6 matto — il pedone e7 è inchiodato e il re soffocato dai suoi pezzi.",
    setup: ["e4", "c6", "d4", "d5", "Nc3", "dxe4", "Nxe4", "Nd7", "Qe2"],
    mainline: ["Ngf6", "Nd6#"],
    variations: [
      { at: [], sans: ["Ndf6"], comment: "L'altro cavallo! Liberando d7, dopo Cd6+ il re avrebbe una via di fuga: niente matto." },
    ],
    steps: [
      {
        path: [],
        text: "L'insidia: De2 sembra una mossa modesta, ma inchioda il pedone e7 sulla colonna del re.",
        shapes: [{ orig: "e2", dest: "e8", brush: "red" }],
        highlightMoves: ["Ndf6", "e6"],
      },
      {
        path: ["Ngf6"],
        text: "L'esca: Cgf6 sviluppa «come sempre»… ma ora ogni casa attorno al re nero è occupata dai suoi pezzi.",
      },
      {
        path: ["Ngf6", "Nd6#"],
        text: "Lo scatto: Cd6 è matto. exd6 è illegale per l'inchiodatura della donna in e2: matto soffocato in 6 mosse.",
        shapes: [{ orig: "e4", dest: "d6", brush: "green" }, { orig: "e2", dest: "e7", brush: "red" }],
      },
    ],
  },

  // 5. La punizione di ...b5 nel Gambetto di Donna Accettato
  {
    id: "22222222-06d0-4000-8000-000000000005",
    slug: "qga-trappola-b5",
    nameIt: "Gambetto di Donna Accettato: la punizione di ...b5",
    nameEn: "QGA ...b5 Punishment",
    category: "opening_trap",
    fame: "known",
    eco: "D20",
    openingIt: "Gambetto di Donna Accettato",
    openingEn: "Queen's Gambit Accepted",
    side: "white",
    motif: ["skewer", "trappedPiece"],
    level: 1,
    intro:
      "Bozza da revisione. Nel Gambetto di Donna Accettato il pedone c4 NON si può tenere: chi ci prova con " +
      "...b5? viene smontato da a4! e dalla doppia sulla diagonale lunga, che costa la torre a8 o l'intera ala.",
    setup: ["d4", "d5", "c4", "dxc4", "e3"],
    mainline: ["b5", "a4", "c6", "axb5", "cxb5", "Qf3"],
    variations: [
      { at: [], sans: ["Nf6"], comment: "La via maestra: non difendere c4, sviluppare. Il Bianco lo ricupererà comunque (Axc4)." },
    ],
    steps: [
      {
        path: ["b5"],
        text: "L'esca: ...b5 prova a tenere il pedone guadagnato. Sembra logico, ma indebolisce tutta la diagonale a8-h1.",
      },
      {
        path: ["b5", "a4", "c6", "axb5", "cxb5"],
        text: "La leva a4! ha forzato lo scambio: ora i pedoni neri b5/c4 sono avanzati ma la retroguardia è vuota.",
        shapes: [{ orig: "a8", brush: "red" }],
      },
      {
        path: ["b5", "a4", "c6", "axb5", "cxb5", "Qf3"],
        text: "Lo scatto: Df3! colpisce la torre a8 lungo la diagonale ormai sgombra. Il Nero perde materiale (se ...Cc6, Dxc6+ vince un pezzo).",
        shapes: [{ orig: "f3", dest: "a8", brush: "green" }],
      },
    ],
  },

  // 6. Matto dell'Imbecille (Fool's Mate)
  {
    id: "22222222-06d0-4000-8000-000000000006",
    slug: "matto-dell-imbecille",
    nameIt: "Matto dell'Imbecille",
    nameEn: "Fool's Mate",
    category: "opening_trap",
    fame: "famous",
    eco: "A00",
    openingIt: "Mosse irregolari (1.f3)",
    openingEn: "Irregular openings (1.f3)",
    side: "black",
    motif: ["mate"],
    level: 0,
    intro:
      "Bozza da revisione. Il matto più veloce possibile: due mosse. Non capiterà spesso, ma insegna una " +
      "lezione permanente: la diagonale e1-h4 è la vena scoperta del re — non aprirla mai gratis.",
    setup: [],
    mainline: ["f3", "e5", "g4", "Qh4#"],
    variations: [
      { at: ["f3", "e5"], sans: ["e4", "Qh4+", "g3"], comment: "Anche qui ...Dh4+ punge, ma g3 para: indebolire f3 era brutto, g4?? era perdente." },
    ],
    steps: [
      {
        path: ["f3"],
        text: "f3 non sviluppa nulla e apre la diagonale e1-h4 verso il re. Già qui il Bianco gioca col fuoco.",
        shapes: [{ orig: "h4", dest: "e1", brush: "red" }],
      },
      {
        path: ["f3", "e5", "g4"],
        text: "L'errore fatale: g4?? spalanca del tutto la diagonale. Il Nero ha una sola mossa da trovare.",
        highlightMoves: ["Qh4#"],
      },
      {
        path: ["f3", "e5", "g4", "Qh4#"],
        text: "Dh4 è matto: nessun pezzo può interporsi su g3 e il re non ha case. Due mosse, partita finita.",
        shapes: [{ orig: "h4", dest: "e1", brush: "green" }],
      },
    ],
  },

  // 7. Il matto Dh5 dell'Olandese
  {
    id: "22222222-06d0-4000-8000-000000000007",
    slug: "matto-olandese-dh5",
    nameIt: "Trappola dell'Olandese (matto in h5)",
    nameEn: "Dutch Defense Qh5 Mate Trap",
    category: "opening_trap",
    fame: "known",
    eco: "A80",
    openingIt: "Difesa Olandese",
    openingEn: "Dutch Defense",
    side: "white",
    motif: ["mate", "sacrifice"],
    level: 1,
    intro:
      "Bozza da revisione. Contro l'Olandese, 2.Ag5 tenta il Nero a cacciare l'alfiere con h6 e g5: " +
      "ma chi lo cattura con ...f4?? e ...fxg3?? apre la diagonale d1-h5 e subisce matto immediato.",
    setup: ["d4", "f5", "Bg5", "h6", "Bh4", "g5", "Bg3", "f4"],
    mainline: ["e3", "fxg3", "Qh5#"],
    variations: [
      { at: ["e3"], sans: ["Nf6"], comment: "Obbligata: para Dh5+. Il «guadagno» dell'alfiere in g3 era avvelenato." },
    ],
    steps: [
      {
        path: [],
        text: "Il Nero ha inseguito l'alfiere con h6-g5-f4 e crede di vincerlo. Ma guarda le case attorno al suo re.",
        shapes: [{ orig: "e8", brush: "red" }, { orig: "h5", dest: "e8", brush: "red" }],
      },
      {
        path: ["e3"],
        text: "Lo scatto: e3! apre la strada alla donna verso h5 e NON salva l'alfiere. È un'esca avvelenata.",
        shapes: [{ orig: "d1", dest: "h5", brush: "green" }],
        highlightMoves: ["Nf6"],
      },
      {
        path: ["e3", "fxg3", "Qh5#"],
        text: "Dh5 è matto: la diagonale h5-e8 è aperta, g6 non è copribile e il re è murato dai suoi pedoni.",
      },
    ],
  },

  // 8. Trappola della Viennese (copycat)
  {
    id: "22222222-06d0-4000-8000-000000000008",
    slug: "trappola-viennese",
    nameIt: "Trappola della Viennese",
    nameEn: "Vienna Copycat Trap",
    category: "opening_trap",
    fame: "known",
    eco: "C27",
    openingIt: "Partita Viennese",
    openingEn: "Vienna Game",
    side: "white",
    motif: ["fork", "doubleCheck", "attack"],
    level: 2,
    intro:
      "Bozza da revisione. Nella Viennese il «trucco della forchetta» 3...Cxe4 va saputo gestire: dopo 4.Dh5! " +
      "il Nero deve essere preciso; il naturale 5...Cc6?? permette 6.Cb5! e la forchetta in c7 vince la torre.",
    setup: ["e4", "e5", "Nc3", "Nf6", "Bc4"],
    mainline: ["Nxe4", "Qh5", "Nd6", "Bb3", "Nc6", "Nb5", "g6", "Qf3", "f5", "Qd5", "Qe7", "Nxc7+", "Kd8", "Nxa8"],
    variations: [
      { at: ["Nxe4", "Qh5", "Nd6", "Bb3"], sans: ["Be7"], comment: "La difesa corretta: copre le case critiche e prepara ...0-0." },
    ],
    steps: [
      {
        path: ["Nxe4", "Qh5"],
        text: "Dopo il trucco 3...Cxe4, Dh5! minaccia subito il matto in f7 e il pedone e5: il Nero è già sul filo.",
        shapes: [{ orig: "h5", dest: "f7", brush: "red" }, { orig: "h5", dest: "e5", brush: "red" }],
      },
      {
        path: ["Nxe4", "Qh5", "Nd6", "Bb3", "Nc6"],
        text: "L'esca: Cc6?? difende e5 ma ignora il punto c7. Era necessaria la modesta Ae7 (vedi variante).",
        highlightMoves: ["Be7"],
      },
      {
        path: ["Nxe4", "Qh5", "Nd6", "Bb3", "Nc6", "Nb5"],
        text: "Lo scatto: Cb5! converge su c7 insieme alla minaccia su f7. Il Nero non può parare tutto.",
        shapes: [{ orig: "b5", dest: "c7", brush: "green" }],
      },
      {
        path: ["Nxe4", "Qh5", "Nd6", "Bb3", "Nc6", "Nb5", "g6", "Qf3", "f5", "Qd5", "Qe7", "Nxc7+", "Kd8", "Nxa8"],
        text: "Il seguito: la forchetta Cxc7+ raccoglie la torre in a8. Il Bianco esce con materiale netto in più.",
      },
    ],
  },

  // 9. Trappola di Greco (Difesa Owen)
  {
    id: "22222222-06d0-4000-8000-000000000009",
    slug: "trappola-di-greco-owen",
    nameIt: "Trappola di Greco (Difesa Owen)",
    nameEn: "Greco's Trap (Owen Defense)",
    category: "sacrifice",
    fame: "known",
    eco: "B00",
    openingIt: "Difesa Owen",
    openingEn: "Owen Defense",
    side: "white",
    motif: ["sacrifice", "discoveredAttack", "mate"],
    level: 2,
    intro:
      "Bozza da revisione. Una miniatura di Gioachino Greco (1619!): nella Owen, ...f5? apre al Bianco " +
      "un attacco da manuale con Dh5+ e un pedone che avanza dando scacco di scoperta, fino al matto d'alfiere.",
    setup: ["e4", "b6", "d4", "Bb7", "Bd3"],
    mainline: ["f5", "exf5", "Bxg2", "Qh5+", "g6", "fxg6", "Nf6", "gxh7+", "Nxh5", "Bg6#"],
    variations: [
      { at: [], sans: ["e6"], comment: "Solido: niente ...f5 prematuro, prima lo sviluppo." },
    ],
    steps: [
      {
        path: ["f5"],
        text: "L'esca: ...f5? vuole aprire la diagonale dell'alfiere b7, ma espone il re prima dello sviluppo.",
        shapes: [{ orig: "e8", brush: "red" }],
      },
      {
        path: ["f5", "exf5", "Bxg2", "Qh5+", "g6", "fxg6"],
        text: "Il Nero ha vinto «materiale» in g2, ma il pedone g6 è una scheggia nel cuore della sua posizione.",
        shapes: [{ orig: "g6", brush: "green" }],
      },
      {
        path: ["f5", "exf5", "Bxg2", "Qh5+", "g6", "fxg6", "Nf6", "gxh7+"],
        text: "Lo scatto: gxh7+!! Il pedone cattura scoprendo lo scacco della donna: il Nero deve prendere in h5.",
        shapes: [{ orig: "h5", dest: "e8", brush: "green" }],
      },
      {
        path: ["f5", "exf5", "Bxg2", "Qh5+", "g6", "fxg6", "Nf6", "gxh7+", "Nxh5", "Bg6#"],
        text: "Il seguito: Ag6 è matto — il re nero è murato dai suoi pezzi e f7 è coperta dall'alfiere. Greco, quattro secoli fa.",
      },
    ],
  },

  // 10. Trappola della Russa (Petrov)
  {
    id: "22222222-06d0-4000-8000-000000000010",
    slug: "trappola-della-russa",
    nameIt: "Trappola della Russa (Petrov)",
    nameEn: "Petrov Copycat Trap",
    category: "opening_trap",
    fame: "famous",
    eco: "C42",
    openingIt: "Partita Russa (Petrov)",
    openingEn: "Russian Game (Petrov)",
    side: "white",
    motif: ["discoveredAttack", "fork"],
    level: 1,
    intro:
      "Bozza da revisione. Nella Russa l'ordine delle mosse è tutto: 3...Cxe4? subito (invece di 3...d6) " +
      "permette 4.De2!, e il ritorno «naturale» 4...Cf6?? cade in Cc6+: scacco di scoperta che vince la donna.",
    setup: ["e4", "e5", "Nf3", "Nf6", "Nxe5"],
    mainline: ["Nxe4", "Qe2", "Nf6", "Nc6+", "Qe7", "Nxe7", "Bxe7"],
    variations: [
      { at: [], sans: ["d6"], comment: "L'ordine giusto: prima ...d6 caccia il cavallo, POI ...Cxe4." },
      { at: ["Nxe4", "Qe2"], sans: ["Qe7", "Qxe4", "d6"], comment: "La difesa corretta: ...De7! e il Nero recupera il pezzo sul cavallo e5." },
    ],
    steps: [
      {
        path: ["Nxe4"],
        text: "L'esca: copiare con ...Cxe4? sembra simmetrico e giusto, ma il Bianco ha un colpo sulla colonna e.",
        shapes: [{ orig: "e1", dest: "e8", brush: "red" }],
      },
      {
        path: ["Nxe4", "Qe2"],
        text: "De2! attacca il cavallo e prepara la scoperta: ora ritirarsi in f6 è l'errore decisivo.",
        highlightMoves: ["Qe7"],
      },
      {
        path: ["Nxe4", "Qe2", "Nf6", "Nc6+"],
        text: "Lo scatto: Cc6+!! Il cavallo si toglie dando scacco di scoperta della donna E attacca la donna in d8.",
        shapes: [{ orig: "e2", dest: "e8", brush: "green" }, { orig: "c6", dest: "d8", brush: "green" }],
      },
      {
        path: ["Nxe4", "Qe2", "Nf6", "Nc6+", "Qe7", "Nxe7", "Bxe7"],
        text: "Il seguito: qualunque parata, il cavallo raccoglie la donna in e7. Donna contro cavallo: partita decisa.",
      },
    ],
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
      q(spec.nameEn), // colonna storica = inglese (stato post-0019/0021)
      q(spec.category),
      q(spec.fame),
      q(spec.eco),
      q(spec.openingEn),
      q(spec.side),
      arr(spec.motif),
      String(spec.level),
      q(triggerFen),
      q(linePgn),
      jb(lesson),
      "true",
      q(spec.nameIt),
      q(spec.nameEn),
      q(spec.openingIt),
      q(spec.openingEn),
    ];
    return `  (${cells.join(", ")})`;
  })
  .join(",\n");

const cols =
  "id, slug, name, category, fame, eco_code, opening_name, side, motif, level, trigger_fen, line_pgn, body, published, name_it, name_en, opening_name_it, opening_name_en";

const sql = `-- 0029_traps_seed2.sql
-- Secondo batch del modulo Trappole: +10 trappole famose con colonne bilingui.
-- Pipeline motore-verificata: linee e matti validati da chess.js
-- (vedi scripts/seed-traps-2.mts). Contenuti marcati BOZZA DA REVISIONE.
-- Idempotente sullo slug.

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
  published = excluded.published,
  name_it = excluded.name_it,
  name_en = excluded.name_en,
  opening_name_it = excluded.opening_name_it,
  opening_name_en = excluded.opening_name_en;
`;

const out = join(process.cwd(), "supabase", "migrations", "0029_traps_seed2.sql");
await writeFile(out, sql, "utf8");
console.log("Scritto", out);
for (const b of built) {
  console.log(`✓ ${b.spec.slug}: ${b.linePgn}`);
}
