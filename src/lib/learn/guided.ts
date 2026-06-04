/**
 * Partite guidate (Fase 8): miniature istruttive con un commento per ogni mossa.
 * Il PGN è una partita reale e valida (chess.js lo verifica al caricamento);
 * le frecce nel replay sono derivate dalla mossa stessa (origine→destinazione),
 * quindi non servono coordinate scritte a mano.
 *
 * `comments[i]` spiega la i-esima semimossa (ply i+1).
 */

export interface GuidedGame {
  slug: string;
  title: string;
  intro: string;
  pgn: string;
  /** Un commento per ogni semimossa, nell'ordine di gioco. */
  comments: string[];
}

export const GUIDED_GAMES: GuidedGame[] = [
  {
    slug: "matto-del-barbiere",
    title: "Scholar's mate",
    intro:
      "The most famous trap for beginners: White bets everything on a quick mate. Let's see why it works against an inattentive opponent… and how to prevent it.",
    pgn: "1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7#",
    comments: [
      "White opens the center and frees the queen and bishop: a natural move.",
      "Black responds symmetrically, also opening lines.",
      "The bishop aims straight at f7: the weakest square in Black's position, defended only by the king.",
      "Correct development by Black, but it ignores the threat that's coming.",
      "The queen threatens mate on f7 (queen + bishop on the same target). Black MUST defend f7.",
      "A decisive mistake: Black attacks the queen but forgets the mate threat. g6 or Qe7 was needed.",
      "Queen takes f7: checkmate. The king can't flee and no one can capture the queen. Lesson: always watch threats on f7.",
    ],
  },
  {
    slug: "matto-di-legal",
    title: "Légal's mate",
    intro:
      "A classic combination: White sacrifices the queen to deliver mate with the minor pieces. It shows the power of pieces working together.",
    pgn: "1. e4 e5 2. Nf3 d6 3. Bc4 Bg4 4. Nc3 g6 5. Nxe5 Bxd1 6. Bxf7+ Ke7 7. Nd5#",
    comments: [
      "King's pawn opening: White controls the center.", // 1. e4
      "A symmetrical response from Black.", // 1... e5
      "The knight develops and attacks the e5 pawn.", // 2. Nf3
      "Philidor Defense: Black defends e5, but passively.", // 2... d6
      "The bishop aims at f7, Black's weak square.", // 3. Bc4
      "Black pins the knight to the queen: it looks annoying, but it's an illusion.", // 3... Bg4
      "White develops and prepares the combination.", // 4. Nc3
      "Black weakens the king's home.", // 4... g6
      "Sacrifice! The knight takes e5 ignoring the pin: if Black takes the queen, mate follows.", // 5. Nxe5
      "Black takes the bait and captures the queen: now the trap springs.", // 5... Bxd1
      "Bishop takes f7 with check: the king is forced out.", // 6. Bxf7+
      "The king must advance, into the open.", // 6... Ke7
      "Knight to d5: checkmate with just two minor pieces. Teamwork is worth more than the queen.", // 7. Nd5#
    ],
  },
];

export function findGuided(slug: string): GuidedGame | undefined {
  return GUIDED_GAMES.find((g) => g.slug === slug);
}
