/**
 * Scala dei concetti (Fase 8): micro-percorso per principianti, un concetto alla
 * volta. Ogni concetto = una spiegazione breve + alcuni puzzle facili del tema
 * corrispondente (riconoscere → sfruttare). I puzzle arrivano dal dataset reale
 * (nessuna posizione inventata a mano), serviti a difficoltà bassa.
 *
 * Dati statici, importabili sia lato server sia client.
 */

import type { Locale } from "@/i18n/config";

export interface Concept {
  slug: string;
  /** Titolo in inglese (default storico). */
  title: string;
  /** Tema puzzle Lichess da cui pescare gli esercizi. */
  theme: string;
  /** Spiegazione (2-3 frasi), in inglese. */
  intro: string;
  /** Cosa deve fare l'utente nei puzzle, in inglese. */
  goal: string;
  /** Titolo italiano. */
  titleIt: string;
  /** Spiegazione italiana. */
  introIt: string;
  /** Obiettivo italiano. */
  goalIt: string;
}

export const CONCEPTS: Concept[] = [
  {
    slug: "forchetta",
    title: "The fork",
    theme: "fork",
    intro:
      "A fork is when a single piece attacks two (or more) targets at the same time. Your opponent can save only one: the other is yours. The knight is the master of forks, because it strikes where other pieces can't reach.",
    goal: "Find the move that attacks two pieces at once.",
    titleIt: "La forchetta",
    introIt:
      "La forchetta è quando un solo pezzo attacca due (o più) bersagli contemporaneamente. L'avversario può salvarne solo uno: l'altro è tuo. Il cavallo è il maestro delle forchette, perché colpisce dove gli altri pezzi non arrivano.",
    goalIt: "Trova la mossa che attacca due pezzi insieme.",
  },
  {
    slug: "inchiodatura",
    title: "The pin",
    theme: "pin",
    intro:
      "A piece is pinned when it can't move because a more valuable piece (often the king) is behind it. Pinning means paralyzing an opponent's piece and then attacking it at your leisure.",
    goal: "Pin an opponent's piece or exploit a pin.",
    titleIt: "L'inchiodatura",
    introIt:
      "Un pezzo è inchiodato quando non può muoversi perché dietro di lui c'è un pezzo più prezioso (spesso il re). Inchiodare significa paralizzare un pezzo avversario e poi attaccarlo con comodo.",
    goalIt: "Inchioda un pezzo avversario o sfrutta un'inchiodatura.",
  },
  {
    slug: "infilzata",
    title: "The skewer",
    theme: "skewer",
    intro:
      "The skewer is the pin in reverse: the valuable piece is in front, forced to move, leaving the piece behind it to be captured. It works beautifully with pieces that act along lines: queen, rook and bishop.",
    goal: "Attack a valuable piece to win the one behind it.",
    titleIt: "L'infilata",
    introIt:
      "L'infilata è l'inchiodatura al contrario: il pezzo prezioso sta davanti, costretto a spostarsi, lasciando catturare il pezzo dietro di lui. Funziona benissimo coi pezzi che agiscono sulle linee: donna, torre e alfiere.",
    goalIt: "Attacca un pezzo prezioso per vincere quello dietro.",
  },
  {
    slug: "pezzo-in-presa",
    title: "The hanging piece",
    theme: "hangingPiece",
    intro:
      "Before every move, ask yourself: is there an undefended opponent piece? Capturing free material is the simplest way to win a game. An eye for hanging pieces is a player's first skill.",
    goal: "Capture the undefended piece.",
    titleIt: "Il pezzo in presa",
    introIt:
      "Prima di ogni mossa, chiediti: c'è un pezzo avversario indifeso? Catturare materiale gratis è il modo più semplice di vincere una partita. L'occhio per i pezzi in presa è la prima abilità di un giocatore.",
    goalIt: "Cattura il pezzo indifeso.",
  },
  {
    slug: "matto-in-uno",
    title: "Mate in one move",
    theme: "mateIn1",
    intro:
      "Checkmate is check on the king with no escape: the game is over. Learning to see mate in one move trains your eye to recognize when the opponent's king is trapped.",
    goal: "Deliver checkmate in one move.",
    titleIt: "Matto in una mossa",
    introIt:
      "Lo scacco matto è lo scacco al re senza scampo: la partita è finita. Imparare a vedere il matto in una mossa allena l'occhio a riconoscere quando il re avversario è in trappola.",
    goalIt: "Dai scacco matto in una mossa.",
  },
  {
    slug: "matto-corridoio",
    title: "The back-rank mate",
    theme: "backRankMate",
    intro:
      "A king castled behind its pawns can get trapped on the back rank: a rook or queen reaching the end delivers mate because the king has no escape squares. That's why players often make 'luft' for the king by pushing a pawn.",
    goal: "Exploit the back rank to deliver mate.",
    titleIt: "Il matto del corridoio",
    introIt:
      "Un re arroccato dietro i suoi pedoni può restare intrappolato sulla traversa: una torre o una donna che raggiunge il fondo dà matto perché il re non ha case di fuga. Per questo spesso si crea una 'presa d'aria' spingendo un pedone.",
    goalIt: "Sfrutta la traversa per dare matto.",
  },
];

export function findConcept(slug: string): Concept | undefined {
  return CONCEPTS.find((c) => c.slug === slug);
}

/** Vista localizzata di un concetto: title/intro/goal risolti nella lingua. */
export interface LocalizedConcept {
  slug: string;
  theme: string;
  title: string;
  intro: string;
  goal: string;
}

function localizeConcept(c: Concept, locale: Locale): LocalizedConcept {
  const it = locale === "it";
  return {
    slug: c.slug,
    theme: c.theme,
    title: it ? c.titleIt : c.title,
    intro: it ? c.introIt : c.intro,
    goal: it ? c.goalIt : c.goal,
  };
}

/** Lista concetti localizzata. */
export function listConcepts(locale: Locale): LocalizedConcept[] {
  return CONCEPTS.map((c) => localizeConcept(c, locale));
}

/** Concetto localizzato per slug. */
export function getConcept(slug: string, locale: Locale): LocalizedConcept | undefined {
  const c = findConcept(slug);
  return c ? localizeConcept(c, locale) : undefined;
}
