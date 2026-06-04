/**
 * Scala dei concetti (Fase 8): micro-percorso per principianti, un concetto alla
 * volta. Ogni concetto = una spiegazione breve + alcuni puzzle facili del tema
 * corrispondente (riconoscere → sfruttare). I puzzle arrivano dal dataset reale
 * (nessuna posizione inventata a mano), serviti a difficoltà bassa.
 *
 * Dati statici, importabili sia lato server sia client.
 */

export interface Concept {
  slug: string;
  title: string;
  /** Tema puzzle Lichess da cui pescare gli esercizi. */
  theme: string;
  /** Spiegazione (2-3 frasi, italiano). */
  intro: string;
  /** Cosa deve fare l'utente nei puzzle. */
  goal: string;
}

export const CONCEPTS: Concept[] = [
  {
    slug: "forchetta",
    title: "The fork",
    theme: "fork",
    intro:
      "A fork is when a single piece attacks two (or more) targets at the same time. Your opponent can save only one: the other is yours. The knight is the master of forks, because it strikes where other pieces can't reach.",
    goal: "Find the move that attacks two pieces at once.",
  },
  {
    slug: "inchiodatura",
    title: "The pin",
    theme: "pin",
    intro:
      "A piece is pinned when it can't move because a more valuable piece (often the king) is behind it. Pinning means paralyzing an opponent's piece and then attacking it at your leisure.",
    goal: "Pin an opponent's piece or exploit a pin.",
  },
  {
    slug: "infilzata",
    title: "The skewer",
    theme: "skewer",
    intro:
      "The skewer is the pin in reverse: the valuable piece is in front, forced to move, leaving the piece behind it to be captured. It works beautifully with pieces that act along lines: queen, rook and bishop.",
    goal: "Attack a valuable piece to win the one behind it.",
  },
  {
    slug: "pezzo-in-presa",
    title: "The hanging piece",
    theme: "hangingPiece",
    intro:
      "Before every move, ask yourself: is there an undefended opponent piece? Capturing free material is the simplest way to win a game. An eye for hanging pieces is a player's first skill.",
    goal: "Capture the undefended piece.",
  },
  {
    slug: "matto-in-uno",
    title: "Mate in one move",
    theme: "mateIn1",
    intro:
      "Checkmate is check on the king with no escape: the game is over. Learning to see mate in one move trains your eye to recognize when the opponent's king is trapped.",
    goal: "Deliver checkmate in one move.",
  },
  {
    slug: "matto-corridoio",
    title: "The back-rank mate",
    theme: "backRankMate",
    intro:
      "A king castled behind its pawns can get trapped on the back rank: a rook or queen reaching the end delivers mate because the king has no escape squares. That's why players often make 'luft' for the king by pushing a pawn.",
    goal: "Exploit the back rank to deliver mate.",
  },
];

export function findConcept(slug: string): Concept | undefined {
  return CONCEPTS.find((c) => c.slug === slug);
}
