/**
 * Partite guidate (Fase 8): miniature istruttive con un commento per ogni mossa.
 * Il PGN è una partita reale e valida (chess.js lo verifica al caricamento);
 * le frecce nel replay sono derivate dalla mossa stessa (origine→destinazione),
 * quindi non servono coordinate scritte a mano.
 *
 * `comments[i]` spiega la i-esima semimossa (ply i+1).
 */

import type { Locale } from "@/i18n/config";

export interface GuidedGame {
  slug: string;
  /** Titolo in inglese (default storico). */
  title: string;
  /** Introduzione in inglese. */
  intro: string;
  pgn: string;
  /** Un commento per ogni semimossa (inglese), nell'ordine di gioco. */
  comments: string[];
  /** Titolo italiano. */
  titleIt: string;
  /** Introduzione italiana. */
  introIt: string;
  /** Commenti italiani, stesso ordine di `comments`. */
  commentsIt: string[];
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
    titleIt: "Il matto del barbiere",
    introIt:
      "La trappola più famosa per i principianti: il Bianco punta tutto su un matto rapido. Vediamo perché funziona contro un avversario distratto… e come prevenirla.",
    commentsIt: [
      "Il Bianco apre il centro e libera donna e alfiere: una mossa naturale.",
      "Il Nero risponde in modo simmetrico, aprendo anche lui le linee.",
      "L'alfiere punta dritto a f7: la casa più debole della posizione del Nero, difesa solo dal re.",
      "Sviluppo corretto del Nero, ma ignora la minaccia che sta arrivando.",
      "La donna minaccia matto su f7 (donna + alfiere sullo stesso bersaglio). Il Nero DEVE difendere f7.",
      "Errore decisivo: il Nero attacca la donna ma dimentica la minaccia di matto. Serviva g6 o De7.",
      "La donna prende f7: scacco matto. Il re non può fuggire e nessuno può catturare la donna. Lezione: sorveglia sempre le minacce su f7.",
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
    titleIt: "Il matto di Légal",
    introIt:
      "Una combinazione classica: il Bianco sacrifica la donna per dare matto con i pezzi minori. Mostra la forza dei pezzi che collaborano.",
    commentsIt: [
      "Apertura di pedone di re: il Bianco controlla il centro.", // 1. e4
      "Una risposta simmetrica del Nero.", // 1... e5
      "Il cavallo si sviluppa e attacca il pedone e5.", // 2. Nf3
      "Difesa Philidor: il Nero difende e5, ma passivamente.", // 2... d6
      "L'alfiere punta a f7, la casa debole del Nero.", // 3. Bc4
      "Il Nero inchioda il cavallo alla donna: sembra fastidioso, ma è un'illusione.", // 3... Bg4
      "Il Bianco sviluppa e prepara la combinazione.", // 4. Nc3
      "Il Nero indebolisce la casa del re.", // 4... g6
      "Sacrificio! Il cavallo prende e5 ignorando l'inchiodatura: se il Nero prende la donna, segue il matto.", // 5. Nxe5
      "Il Nero abbocca e cattura la donna: ora scatta la trappola.", // 5... Bxd1
      "L'alfiere prende f7 con scacco: il re è costretto a uscire.", // 6. Bxf7+
      "Il re deve avanzare, allo scoperto.", // 6... Ke7
      "Cavallo in d5: scacco matto con due soli pezzi minori. Il gioco di squadra vale più della donna.", // 7. Nd5#
    ],
  },
];

export function findGuided(slug: string): GuidedGame | undefined {
  return GUIDED_GAMES.find((g) => g.slug === slug);
}

/** Vista localizzata di una partita guidata. */
export interface LocalizedGuidedGame {
  slug: string;
  pgn: string;
  title: string;
  intro: string;
  comments: string[];
}

function localizeGuided(g: GuidedGame, locale: Locale): LocalizedGuidedGame {
  const it = locale === "it";
  return {
    slug: g.slug,
    pgn: g.pgn,
    title: it ? g.titleIt : g.title,
    intro: it ? g.introIt : g.intro,
    comments: it ? g.commentsIt : g.comments,
  };
}

/** Lista partite guidate localizzata. */
export function listGuided(locale: Locale): LocalizedGuidedGame[] {
  return GUIDED_GAMES.map((g) => localizeGuided(g, locale));
}

/** Partita guidata localizzata per slug. */
export function getGuided(slug: string, locale: Locale): LocalizedGuidedGame | undefined {
  const g = findGuided(slug);
  return g ? localizeGuided(g, locale) : undefined;
}
