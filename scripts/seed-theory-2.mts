/**
 * Secondo batch del ramo Teoria (0030): +6 finali fondamentali e +5 temi di
 * mediogioco. Scrive `supabase/migrations/0030_theory_seed2.sql`.
 *
 *   npx tsx scripts/seed-theory-2.mts
 *
 * Garanzie di correttezza (stesse del 06c):
 *  - FINALI: linea = gioco OTTIMALE di entrambi i lati secondo la tablebase
 *    Lichess; in più l'ESITO della posizione di pratica è ASSERITO contro la
 *    tablebase (goal win → categoria "win", goal draw → "draw"): se non
 *    coincide, la generazione fallisce.
 *  - MEDIOGIOCO: posizioni e linee illustrative validate per LEGALITÀ con
 *    chess.js; le valutazioni vere arrivano dal motore a runtime.
 * Prose in italiano BOZZA DA REVISIONE. Emette anche le colonne bilingui (0021).
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
import { fetchTablebase } from "../src/lib/theory/tablebase.ts";
import type { Lesson, LessonStep } from "../src/lib/theory/types.ts";
import type { EndgamePractice } from "../src/lib/theory/endgame.ts";
import type { PositionalExercise } from "../src/lib/theory/middlegame.ts";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ───────────────────────────── helper comuni ─────────────────────────────

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

// ─────────────────────────────── FINALI (6) ───────────────────────────────

interface EndgameSeed {
  slug: string;
  titleIt: string;
  titleEn: string;
  summaryIt: string;
  summaryEn: string;
  order: number;
  intro: string;
  practice: EndgamePractice;
  maxPlies: number;
  steps: { at: number; text: string; shapes?: Shape[] }[];
}

const ENDGAMES: EndgameSeed[] = [
  {
    slug: "matto-di-torre",
    titleIt: "Matto di re e torre",
    titleEn: "King and rook mate",
    summaryIt: "La «scatola» che si restringe: il metodo per mattare con la sola torre.",
    summaryEn: "The shrinking box: the method to mate with a single rook.",
    order: 5,
    intro:
      "Il matto di torre è il più tecnico dei matti elementari: la torre TAGLIA il re avversario " +
      "su una porzione di scacchiera (la «scatola»), il re si avvicina, e la scatola si restringe " +
      "una traversa alla volta fino al bordo. Quando i re si fronteggiano in opposizione, lo scacco " +
      "di torre guadagna una traversa o dà il matto. (Bozza da revisione.)",
    practice: {
      fen: "4k3/8/8/8/8/8/4K3/7R w - - 0 1",
      userColor: "white",
      goal: "win",
      progressKey: "kr_vs_k",
      hint: "Taglia il re con la torre, avvicina il tuo re in opposizione e restringi la «scatola» una traversa alla volta.",
    },
    maxPlies: 18,
    steps: [
      {
        at: 0,
        text: "La torre da sola non matta: serve la coppia. Il piano è tagliare il re nero e portare il re bianco a contatto, in opposizione.",
        shapes: [{ orig: "h1", brush: "green" }],
      },
      {
        at: 6,
        text: "La scatola si restringe: ogni volta che i re si fronteggiano, la torre può dare scacco e rubare una traversa al re nero.",
      },
      {
        at: 12,
        text: "Il re nero è ormai confinato verso il bordo: con i re in opposizione, lo scacco di torre sull'ultima traversa è matto.",
      },
    ],
  },
  {
    slug: "re-e-pedone-la-difesa",
    titleIt: "Re e pedone: la difesa",
    titleEn: "King and pawn: the defense",
    summaryIt: "Davanti al pedone e in opposizione: come il difensore strappa la patta.",
    summaryEn: "In front of the pawn, holding the opposition: how the defender draws.",
    order: 6,
    intro:
      "L'altra faccia del finale di re e pedone: la DIFESA. La regola d'oro del difensore: re DAVANTI " +
      "al pedone e opposizione presa al momento giusto. Se il re attaccante non riesce a mettersi " +
      "davanti al proprio pedone, la partita è patta — il pedone da solo non sfonda mai. (Bozza da revisione.)",
    practice: {
      fen: "8/8/8/8/4k3/8/4P3/4K3 b - - 0 1",
      userColor: "black",
      goal: "draw",
      progressKey: "kp_vs_k_difesa",
      hint: "Resta davanti al pedone e prendi l'opposizione quando il re avversario avanza: non farti mai aggirare di lato.",
    },
    maxPlies: 14,
    steps: [
      {
        at: 0,
        text: "Il re nero è già davanti al pedone: la condizione difensiva ideale. Da qui, con l'opposizione, la patta è garantita.",
        shapes: [{ orig: "e4", brush: "green" }, { orig: "e2", brush: "red" }],
      },
      {
        at: 4,
        text: "Quando il re bianco avanza, il re nero gli si mette di fronte (opposizione): il pedone non può passare senza concedere lo stallo o la presa.",
      },
    ],
  },
  {
    slug: "alfieri-di-colore-contrario",
    titleIt: "Alfieri di colore contrario: la fortezza",
    titleEn: "Opposite-colored bishops: the fortress",
    summaryIt: "Un pedone in meno ma patta: il blocco sulle case che l'alfiere nemico non vede.",
    summaryEn: "A pawn down but drawn: the blockade on squares the enemy bishop can't reach.",
    order: 7,
    intro:
      "Gli alfieri di colore contrario sono il salvagente dei finali: con UN pedone in meno la patta è " +
      "quasi sempre a portata. Il segreto: il difensore piazza re e alfiere sulle case del colore che " +
      "l'alfiere avversario NON controlla, e blocca il pedone su una casa inattaccabile. La fortezza " +
      "non si può espugnare. (Bozza da revisione.)",
    practice: {
      fen: "8/4k3/8/4PK2/8/1b6/8/2B5 b - - 0 1",
      userColor: "black",
      goal: "draw",
      progressKey: "ocb_fortezza",
      hint: "Blocca con il re la casa davanti al pedone (e6, casa chiara): l'alfiere bianco, campo scuro, non potrà mai scacciarti.",
    },
    maxPlies: 12,
    steps: [
      {
        at: 0,
        text: "Il Bianco ha un pedone in più, ma gli alfieri viaggiano su colori diversi: il Nero costruisce una fortezza sulle case chiare.",
        shapes: [{ orig: "e6", brush: "green" }, { orig: "e5", brush: "red" }],
      },
      {
        at: 4,
        text: "Il re nero presidia la casa di blocco davanti al pedone: l'alfiere bianco, di campo scuro, non potrà mai attaccarla. È patta di fortezza.",
      },
    ],
  },
  {
    slug: "pedoni-passati-uniti",
    titleIt: "Pedoni passati uniti",
    titleEn: "Connected passed pawns",
    summaryIt: "Due pedoni uniti si difendono a vicenda e avanzano: la falange vincente.",
    summaryEn: "Two connected passers defend each other and roll forward: the winning phalanx.",
    order: 8,
    intro:
      "Due pedoni passati UNITI sono una forza vincente: si difendono a vicenda e ogni avanzata toglie " +
      "case al re difensore. Il metodo: avanzare il pedone arretrato (la falange), usare il re a " +
      "sostegno e non spingere mai quello sbagliato quando il re nemico può bloccarli. (Bozza da revisione.)",
    practice: {
      fen: "8/8/8/3k4/8/3PP3/8/3K4 w - - 0 1",
      userColor: "white",
      goal: "win",
      progressKey: "pedoni_uniti",
      hint: "Avanza i pedoni in falange (mai isolarli) e accompagna con il re: il re nero non può fermare due pedoni che si proteggono a vicenda.",
    },
    maxPlies: 16,
    steps: [
      {
        at: 0,
        text: "I pedoni d3 ed e3 sono passati e uniti: nessun pedone nero può fermarli e si proteggono a vicenda quando avanzano in scala.",
        shapes: [{ orig: "d3", brush: "green" }, { orig: "e3", brush: "green" }],
      },
      {
        at: 6,
        text: "La falange avanza con il re a sostegno: quando un pedone è bloccato, l'altro avanza e il re nero deve cedere terreno.",
      },
    ],
  },
  {
    slug: "donna-contro-torre",
    titleIt: "Donna contro torre",
    titleEn: "Queen vs rook",
    summaryIt: "Lo zugzwang che separa torre e re: la tecnica per convertire il vantaggio.",
    summaryEn: "The zugzwang that splits rook and king: the technique to convert.",
    order: 9,
    intro:
      "Donna contro torre è vinto, ma la tecnica va conosciuta: finché la torre resta incollata al re " +
      "è imprendibile; la donna manovra per metterre il difensore in ZUGZWANG, costringendo la torre a " +
      "staccarsi — e una forchetta la raccoglie. È la posizione di Philidor della donna. (Bozza da revisione.)",
    practice: {
      fen: "1k6/1r6/2K5/Q7/8/8/8/8 w - - 0 1",
      userColor: "white",
      goal: "win",
      progressKey: "q_vs_r",
      hint: "Non inseguire la torre: manovra di donna per ridare la stessa posizione con il tratto al Nero (zugzwang). La torre dovrà allontanarsi dal re.",
    },
    maxPlies: 14,
    steps: [
      {
        at: 0,
        text: "La torre incollata al re è imprendibile. L'idea vincente: passare il tratto al difensore con una manovra triangolare della donna.",
        shapes: [{ orig: "b7", brush: "red" }],
      },
      {
        at: 4,
        text: "In zugzwang, la torre deve staccarsi dal re: a quel punto una serie di scacchi prepara la forchetta che la cattura.",
      },
    ],
  },
  {
    slug: "matto-dei-due-alfieri",
    titleIt: "Matto dei due alfieri",
    titleEn: "Two bishops mate",
    summaryIt: "Le due diagonali parallele spingono il re nell'angolo: tecnica e pazienza.",
    summaryEn: "Two parallel diagonals drive the king to the corner: technique and patience.",
    order: 10,
    intro:
      "Con i due alfieri il matto si dà nell'ANGOLO: gli alfieri formano una barriera mobile di due " +
      "diagonali parallele che restringe il re passo dopo passo, mentre il proprio re dà il sostegno. " +
      "Serve pazienza e attenzione allo stallo: ogni mossa della barriera toglie una diagonale al re. (Bozza da revisione.)",
    practice: {
      fen: "4k3/8/4K3/8/8/8/8/2B2B2 w - - 0 1",
      userColor: "white",
      goal: "win",
      progressKey: "bb_vs_k",
      hint: "Costruisci la barriera con gli alfieri su diagonali adiacenti e spingi il re verso l'angolo; il tuo re accompagna a distanza di guardia.",
    },
    maxPlies: 18,
    steps: [
      {
        at: 0,
        text: "I due alfieri affiancati formano un muro che il re non può attraversare. Obiettivo: spingerlo in un angolo qualsiasi.",
        shapes: [{ orig: "c1", brush: "green" }, { orig: "f1", brush: "green" }],
      },
      {
        at: 8,
        text: "La barriera avanza una diagonale alla volta, col re a sostegno. Attento solo allo stallo quando il re nemico è quasi all'angolo.",
      },
    ],
  },
];

// ───────────────────────────── MEDIOGIOCO (5) ─────────────────────────────

interface MiddlegameSeed {
  slug: string;
  titleIt: string;
  titleEn: string;
  summaryIt: string;
  summaryEn: string;
  order: number;
  intro: string;
  setup: string[];
  line: string[];
  /** Varianti opzionali: percorso (SAN dalla posizione-tipo) + mosse. */
  variations?: { at: string[]; sans: string[] }[];
  exercise: Omit<PositionalExercise, "fen" | "userColor">;
  steps: { at: number; text: string; shapes?: Shape[] }[];
}

const MIDDLEGAMES: MiddlegameSeed[] = [
  {
    slug: "sacrificio-greco-axh7",
    titleIt: "Il sacrificio greco (Axh7+)",
    titleEn: "The Greek gift sacrifice (Bxh7+)",
    summaryIt: "Il sacrificio d'alfiere in h7: condizioni, esecuzione e difese tipiche.",
    summaryEn: "The bishop sacrifice on h7: preconditions, execution and typical defenses.",
    order: 3,
    intro:
      "Il sacrificio greco è IL sacrificio tematico contro l'arrocco corto: alfiere in h7, cavallo in g5, " +
      "donna in h5. Funziona quando: l'alfiere punta h7 senza ostacoli, il cavallo arriva in g5, la donna " +
      "arriva in h5, e il Nero NON ha un cavallo in f6 né può difendere con ...Af5/...Dd3. Prima di " +
      "sacrificare, conta i pezzi che partecipano e le case di fuga del re. (Bozza da revisione.)",
    setup: ["e4", "e6", "d4", "d5", "Nd2", "Nf6", "e5", "Nfd7", "Bd3", "c5", "c3", "Nc6", "Ngf3", "Be7", "O-O", "O-O"],
    line: ["Bxh7+", "Kxh7", "Ng5+", "Kg8", "Qh5", "Re8", "Qxf7+", "Kh8"],
    variations: [
      { at: ["Bxh7+"], sans: ["Kh8", "Bd3"] },
      { at: ["Bxh7+", "Kxh7", "Ng5+"], sans: ["Kg6", "Qg4", "f5", "Qg3"] },
    ],
    exercise: {
      prompt:
        "Arrocco nero appena completato, alfiere in d3, cavallo in f3, pedone in e5 che toglie f6: " +
        "valuta le condizioni del sacrificio greco. Quale colpo proponi e quali difese devi calcolare?",
      planHint:
        "Verifica la lista del greco: Axh7+ seguito da Cg5+ e Dh5. Le tre difese da calcolare sono " +
        "...Rg8 (matto o donna persa con l'attacco su f7/h7), ...Rg6 (il re a passeggio: si attacca con " +
        "Dd3+/f5 o h4-h5) e ...Rh6 (raro: occhio a Cxf7+). Se una difesa regge, il sacrificio era scorretto: " +
        "contare prima, sacrificare poi.",
      relatedTacticsTheme: "kingsideAttack",
      progressKey: "sacrificio_greco",
    },
    steps: [
      {
        at: 0,
        text: "La posizione-tipo: alfiere su d3 che fissa h7, cavallo pronto a g5, donna dietro, pedone e5 che nega f6 ai pezzi neri. Tutte le precondizioni del greco ci sono.",
        shapes: [
          { orig: "d3", dest: "h7", brush: "red" },
          { orig: "f3", dest: "g5", brush: "green" },
          { orig: "e5", dest: "f6", brush: "blue" },
        ],
      },
      {
        at: 1,
        text: "Axh7+! Il sacrificio si accetta quasi per forza: rifiutarlo lascia il Bianco con un pedone in più e l'attacco (vedi variante).",
      },
      {
        at: 3,
        text: "Cg5+ è il seguito obbligato: ora il re sceglie tra g8, g6 e h6. Ogni casa ha la sua confutazione — qui la mainline segue ...Rg8.",
        shapes: [{ orig: "h5", brush: "green" }],
      },
      {
        at: 8,
        text: "Con Dxf7+ il Bianco ha già due pedoni per il pezzo e l'attacco prosegue. Da qui in poi: calcola con il motore le risorse di entrambi — il greco vive di precisione.",
      },
    ],
  },
  {
    slug: "attacco-di-minoranza",
    titleIt: "L'attacco di minoranza",
    titleEn: "The minority attack",
    summaryIt: "Due pedoni contro tre sull'ala di donna: b4-b5 per creare la debolezza in c6.",
    summaryEn: "Two pawns vs three on the queenside: b4-b5 to create the c6 weakness.",
    order: 4,
    intro:
      "Nella struttura Carlsbad (tipica del Gambetto di Donna cambiato) il Bianco ha DUE pedoni contro " +
      "TRE sull'ala di donna: sembra un difetto, ma è un piano. La spinta b4-b5 e il cambio in c6 lasciano " +
      "il Nero con un pedone arretrato su colonna aperta: un bersaglio eterno per torri e donna. (Bozza da revisione.)",
    setup: ["d4", "d5", "c4", "e6", "Nc3", "Nf6", "cxd5", "exd5", "Bg5", "Be7", "e3", "c6", "Bd3", "Nbd7", "Qc2", "O-O", "Nf3", "Re8", "O-O", "Nf8"],
    line: ["b4", "Ne4", "Bxe7", "Qxe7", "b5"],
    exercise: {
      prompt:
        "Struttura Carlsbad: catena nera c6-d5, maggioranza bianca assente sull'ala di donna. " +
        "Qual è il piano a lungo termine del Bianco e quale leva lo realizza?",
      planHint:
        "L'attacco di minoranza: a4 (se serve) e b4-b5, per cambiare in c6 e lasciare al Nero un pedone " +
        "arretrato su colonna semiaperta. Poi torri in c1/b1 e pressione perpetua su c6. Il Nero cercherà " +
        "il controgioco al centro o sull'ala di re: la corsa tra i due piani decide la partita.",
      progressKey: "attacco_minoranza",
    },
    steps: [
      {
        at: 0,
        text: "Struttura Carlsbad: il Bianco ha due pedoni (a2, b2) contro tre (a7, b7, c6) sull'ala di donna. Il piano non è difendersi: è ATTACCARE con la minoranza.",
        shapes: [
          { orig: "b2", dest: "b5", brush: "green" },
          { orig: "c6", brush: "red" },
        ],
      },
      {
        at: 1,
        text: "b4! avvia la spinta di minoranza. L'obiettivo non è guadagnare spazio: è arrivare a b5 e cambiare, creando la debolezza permanente in c6.",
      },
      {
        at: 5,
        text: "b5 al traguardo: dopo il cambio in c6 il pedone nero sarà arretrato su colonna aperta — un bersaglio per il resto della partita.",
        shapes: [{ orig: "b5", dest: "c6", brush: "green" }],
      },
    ],
  },
  {
    slug: "la-coppia-degli-alfieri",
    titleIt: "La coppia degli alfieri",
    titleEn: "The bishop pair",
    summaryIt: "Due alfieri contro alfiere e cavallo: aprire il gioco e far respirare le diagonali.",
    summaryEn: "Two bishops vs bishop and knight: open the game and let the diagonals breathe.",
    order: 5,
    intro:
      "La coppia degli alfieri è un vantaggio CONDIZIONALE: vale quando la posizione si apre e le " +
      "diagonali respirano. Chi ha i due alfieri deve aprire linee ed evitare i blocchi; chi ha il " +
      "cavallo cerca strutture chiuse e un avamposto stabile. Qui il Bianco (Sämisch della Nimzo) ha " +
      "la coppia e i pedoni doppiati: il piano è e4 e l'espansione centrale. (Bozza da revisione.)",
    setup: ["d4", "Nf6", "c4", "e6", "Nc3", "Bb4", "a3", "Bxc3+", "bxc3", "c5", "e3", "Nc6", "Bd3", "O-O", "Ne2", "b6", "O-O", "Ba6"],
    line: ["e4", "Ne8", "Be3", "d6", "Ng3"],
    exercise: {
      prompt:
        "Il Bianco ha la coppia degli alfieri ma pedoni doppiati in c3/c4. Quale piano valorizza gli " +
        "alfieri e cosa deve evitare?",
      planHint:
        "Aprire il centro con e4 (ed eventualmente f4-f5): più la posizione si apre, più i due alfieri " +
        "dominano. Da evitare: i cambi che riducono il vantaggio e le strutture bloccate dove il cavallo " +
        "trova un avamposto. Il Nero, all'opposto, vuole fissare i pedoni doppiati e chiudere il gioco.",
      progressKey: "coppia_alfieri",
    },
    steps: [
      {
        at: 0,
        text: "Il Nero ha ceduto l'alfiere in c3: il Bianco ha la coppia ma pedoni doppiati. I due piani sono già scritti: aprire (Bianco) contro bloccare (Nero).",
        shapes: [{ orig: "c3", brush: "red" }, { orig: "d3", dest: "h7", brush: "green" }],
      },
      {
        at: 1,
        text: "e4! Il centro mobile è il polmone degli alfieri: ogni linea che si apre aumenta il loro raggio. Senza questa spinta, la coppia resta un vantaggio sulla carta.",
      },
      {
        at: 5,
        text: "Il Bianco completa lo schieramento (Ae3, Cg3) e prepara f4-f5: gli alfieri puntano entrambe le ali. Il vantaggio della coppia si misura in diagonali aperte.",
      },
    ],
  },
  {
    slug: "manovra-e-profilassi",
    titleIt: "Manovra e profilassi",
    titleEn: "Maneuvering and prophylaxis",
    summaryIt: "Migliorare il pezzo peggiore e prevenire i piani avversari: il gioco lento dell'Italiana.",
    summaryEn: "Improve your worst piece and prevent the opponent's plans: slow play in the Italian.",
    order: 6,
    intro:
      "Quando non ci sono colpi tattici, la domanda giusta è doppia: «qual è il mio pezzo peggiore?» e " +
      "«cosa vuole fare l'avversario?». La PROFILASSI (h3 contro ...Ag4, la difesa preventiva delle case " +
      "deboli) e la MANOVRA (il giro Cb1-d2-f1-g3 dell'Italiana lenta) sono il pane del mediogioco di " +
      "posizione. (Bozza da revisione.)",
    setup: ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "c3", "Nf6", "d3", "d6", "O-O", "O-O", "Re1", "a6", "Bb3", "Ba7", "h3", "h6", "Nbd2"],
    line: ["Re8", "Nf1", "Be6", "Ng3"],
    exercise: {
      prompt:
        "Italiana lenta, nessun colpo tattico disponibile. Qual è il pezzo bianco peggiore e qual è la " +
        "manovra che lo migliora?",
      planHint:
        "Il cavallo in d2 morde poco: il giro classico è Cd2-f1-g3 (o f1-e3), verso f5/d5. Nel frattempo " +
        "h3 ha già tolto ...Ag4 (profilassi). Ogni mossa deve o migliorare un pezzo o prevenire un piano " +
        "avversario: il vantaggio nelle posizioni lente si accumula così, una micro-miglioria alla volta.",
      progressKey: "profilassi",
    },
    steps: [
      {
        at: 0,
        text: "Posizione senza tattica: comanda la strategia. h3 era profilassi (niente ...Ag4); ora tocca al pezzo peggiore, il cavallo in d2.",
        shapes: [{ orig: "d2", brush: "red" }],
      },
      {
        at: 2,
        text: "Cf1: il primo tempo del giro. Il cavallo passa dietro le linee verso g3 (o e3), puntando alle case f5 e d5.",
        shapes: [{ orig: "d2", dest: "f1", brush: "green" }, { orig: "f1", dest: "g3", brush: "green" }],
      },
      {
        at: 4,
        text: "Cg3 completa la manovra: il cavallo ora guarda f5. Tre tempi spesi bene valgono più di una spinta frettolosa: è il ritmo del gioco di manovra.",
      },
    ],
  },
  {
    slug: "arrocchi-opposti-la-corsa",
    titleIt: "Arrocchi opposti: la corsa",
    titleEn: "Opposite-side castling: the race",
    summaryIt: "Quando i re stanno su ali opposte vince chi attacca più in fretta: pedoni e colonne.",
    summaryEn: "With kings on opposite wings the faster attack wins: pawns and files.",
    order: 7,
    intro:
      "Con gli arrocchi su ali opposte il gioco cambia natura: si spingono i PEDONI contro il re nemico " +
      "(non indeboliscono il proprio!) per aprire colonne, e ogni tempo vale doppio. La regola: non " +
      "difendere, CORRERE. Qui la struttura tipo della Jugoslava contro il Dragone: h4-h5 contro " +
      "...Tc8 e il sacrificio di qualità in c3. (Bozza da revisione.)",
    setup: ["e4", "c5", "Nf3", "d6", "d4", "cxd4", "Nxd4", "Nf6", "Nc3", "g6", "Be3", "Bg7", "f3", "O-O", "Qd2", "Nc6", "Bc4", "Bd7", "O-O-O", "Rc8", "Bb3", "Ne5", "h4"],
    line: ["Nc4", "Bxc4", "Rxc4", "h5"],
    exercise: {
      prompt:
        "Arrocchi opposti: il Bianco spinge h4-h5, il Nero preme sulla colonna c. Come si valuta chi è " +
        "più veloce e quali cambi favoriscono ciascun lato?",
      planHint:
        "Conta i tempi all'apertura della prima colonna utile contro il re. Il Bianco vuole h5xg6 e " +
        "l'ingresso di donna/torre sulla colonna h; il Nero vive sulla colonna c (...Txc3! è il sacrificio " +
        "tematico che demolisce l'arrocco lungo). Ogni mossa difensiva è un tempo regalato alla corsa avversaria.",
      relatedTacticsTheme: "kingsideAttack",
      progressKey: "arrocchi_opposti",
    },
    steps: [
      {
        at: 0,
        text: "Re su ali opposte: il Bianco ha già lanciato h4 e il Nero ha la torre in c8. La partita è una corsa a chi apre prima una colonna sul re nemico.",
        shapes: [
          { orig: "h4", dest: "h5", brush: "green" },
          { orig: "c8", dest: "c3", brush: "red" },
        ],
      },
      {
        at: 3,
        text: "Il Nero ha dato cavallo per alfiere pur di tenere viva la pressione in colonna c: contro l'arrocco lungo, ...Txc3 è sempre nell'aria.",
        shapes: [{ orig: "c4", dest: "c3", brush: "red" }],
      },
      {
        at: 4,
        text: "h5! La spinta non si ferma: il Bianco offre l'apertura della colonna h. In queste posizioni i pedoni davanti al PROPRIO re non contano: contano le colonne contro quello nemico.",
      },
    ],
  },
];

// ──────────────────────────────── build ───────────────────────────────────

interface Built {
  type: "endgame" | "middlegame";
  slug: string;
  titleIt: string;
  titleEn: string;
  summaryIt: string;
  summaryEn: string;
  order: number;
  startFen: string;
  linePgn: string;
  body: unknown;
}

function lessonSteps(ids: string[], defs: { at: number; text: string; shapes?: Shape[] }[]): LessonStep[] {
  return defs.map((d) => {
    const nodeId = ids[Math.min(d.at, ids.length - 1)];
    return { nodeId, text: d.text, shapes: d.shapes };
  });
}

async function buildEndgame(seed: EndgameSeed): Promise<Built> {
  // L'esito della posizione di pratica è ASSERITO contro la tablebase: il lato
  // al tratto è sempre userColor in questi seed, quindi goal win → "win",
  // goal draw → "draw". Se non coincide, meglio fallire che pubblicare il falso.
  const verdict = await fetchTablebase(seed.practice.fen);
  await sleep(350);
  if (!verdict.ok) throw new Error(`[${seed.slug}] tablebase non raggiungibile: ${verdict.error}`);
  const expected = seed.practice.goal === "win" ? "win" : "draw";
  if (verdict.data.category !== expected) {
    throw new Error(`[${seed.slug}] esito tablebase "${verdict.data.category}" ≠ goal "${expected}"`);
  }

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
    type: "endgame",
    slug: seed.slug,
    titleIt: seed.titleIt,
    titleEn: seed.titleEn,
    summaryIt: seed.summaryIt,
    summaryEn: seed.summaryEn,
    order: seed.order,
    startFen: tree.nodes[tree.rootId].fen,
    linePgn: toPgn(tree),
    body: lesson,
  };
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

function buildMiddlegame(seed: MiddlegameSeed): Built {
  const chess = new Chess();
  for (const san of seed.setup) chess.move(san); // valida la legalità
  const startFen = chess.fen();
  const userColor: "white" | "black" = startFen.split(" ")[1] === "b" ? "black" : "white";

  let tree = createTree(startFen);
  const added = addLine(tree, tree.rootId, seed.line);
  tree = added.tree;
  for (const v of seed.variations ?? []) {
    const branchId = findByPath(tree, v.at);
    tree = addLine(tree, branchId, v.sans).tree;
  }
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
    type: "middlegame",
    slug: seed.slug,
    titleIt: seed.titleIt,
    titleEn: seed.titleEn,
    summaryIt: seed.summaryIt,
    summaryEn: seed.summaryEn,
    order: seed.order,
    startFen,
    linePgn: toPgn(tree),
    body: lesson,
  };
}

const q = (s: string) => s.replace(/'/g, "''");
/** JSON con a-capo dopo ogni "}," strutturale (mai dentro le stringhe): righe corte, jsonb identico. */
const wrapJson = (s: string): string =>
  s.replace(/("(?:[^"\\]|\\.)*")|},/g, (m, str) => (str !== undefined ? str : "},\n"));

function rowSql(b: Built): string {
  const body = q(wrapJson(JSON.stringify(b.body)));
  return `(
  '${b.type}',
  '${q(b.titleEn)}',
  '${b.slug}',
  '${q(b.summaryEn)}',
  '${body}'::jsonb,
  '${b.startFen}',
  '${q(b.linePgn)}',
  0,
  ${b.order},
  true,
  '${q(b.titleIt)}',
  '${q(b.titleEn)}',
  '${q(b.summaryIt)}',
  '${q(b.summaryEn)}'
)`;
}

async function main() {
  const built: Built[] = [];

  console.log("Genero i finali (esito asserito + linee ottimali dalla tablebase)…");
  for (const e of ENDGAMES) {
    const b = await buildEndgame(e);
    console.log(`  ✓ ${e.slug} — mainline: ${b.linePgn}`);
    built.push(b);
  }

  console.log("Genero i temi di mediogioco…");
  for (const m of MIDDLEGAMES) {
    const b = buildMiddlegame(m);
    console.log(`  ✓ ${m.slug} — FEN: ${b.startFen}`);
    built.push(b);
  }

  const values = built.map(rowSql).join(",\n");
  const sql = `-- 0030_theory_seed2.sql
-- Secondo batch del ramo Teoria: +6 finali fondamentali e +5 temi di mediogioco,
-- con colonne bilingui (0021). Generato da scripts/seed-theory-2.mts —
-- idempotente sullo slug.
--
-- Correttezza: per i FINALI l'esito della posizione di pratica è ASSERITO
-- contro la tablebase Lichess e la linea è il gioco ottimale di entrambi i
-- lati; MEDIOGIOCO validato per legalità con chess.js. Prose BOZZA DA REVISIONE.

insert into content_items (type, title, slug, summary, body, start_fen, line_pgn, level, order_index, published, title_it, title_en, summary_it, summary_en)
values
${values}
on conflict (slug) do update set
  type = excluded.type,
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
  summary_en = excluded.summary_en;
`;

  const out = join(process.cwd(), "supabase", "migrations", "0030_theory_seed2.sql");
  await writeFile(out, sql, "utf8");
  console.log("\nScritto", out);
  console.log("Righe:", built.length);
}

await main();
