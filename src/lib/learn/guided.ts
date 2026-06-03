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
    title: "Il matto del barbiere",
    intro:
      "La trappola più famosa per chi inizia: il Bianco punta tutto su un matto rapido. Vediamo perché funziona contro chi non sta attento… e come si previene.",
    pgn: "1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7#",
    comments: [
      "Il Bianco apre il centro e libera Donna e Alfiere: mossa naturale.",
      "Il Nero risponde simmetrico, anch'egli apre le linee.",
      "L'Alfiere punta dritto su f7: la casella più debole nella posizione del Nero, difesa solo dal Re.",
      "Sviluppo corretto del Nero, ma ignora la minaccia che sta arrivando.",
      "La Donna minaccia matto in f7 (Donna + Alfiere sullo stesso bersaglio). Il Nero DEVE difendere f7.",
      "Errore decisivo: il Nero attacca la Donna ma dimentica la minaccia di matto. Andava giocato g6 o Qe7.",
      "Donna prende f7: scacco matto. Il Re non può fuggire e nessuno può catturare la Donna. Lezione: controlla sempre le minacce su f7.",
    ],
  },
  {
    slug: "matto-di-legal",
    title: "Il matto di Légal",
    intro:
      "Una combinazione classica: il Bianco sacrifica la Donna per dare matto con i pezzi minori. Mostra la potenza dei pezzi che collaborano.",
    pgn: "1. e4 e5 2. Nf3 d6 3. Bc4 Bg4 4. Nc3 g6 5. Nxe5 Bxd1 6. Bxf7+ Ke7 7. Nd5#",
    comments: [
      "Apertura di Re: il Bianco controlla il centro.", // 1. e4
      "Risposta simmetrica del Nero.", // 1... e5
      "Il Cavallo sviluppa e attacca il pedone e5.", // 2. Nf3
      "Difesa Philidor: il Nero difende e5, ma in modo passivo.", // 2... d6
      "L'Alfiere punta a f7, la casella debole del Nero.", // 3. Bc4
      "Il Nero inchioda il Cavallo alla Donna: sembra fastidioso, ma è un'illusione.", // 3... Bg4
      "Il Bianco sviluppa e prepara la combinazione.", // 4. Nc3
      "Il Nero indebolisce la casa del Re.", // 4... g6
      "Sacrificio! Il Cavallo prende e5 ignorando l'inchiodatura: se il Nero prende la Donna, arriva il matto.", // 5. Nxe5
      "Il Nero abbocca e cattura la Donna: ora la trappola scatta.", // 5... Bxd1
      "Alfiere prende f7 con scacco: il Re è costretto a uscire.", // 6. Bxf7+
      "Il Re deve avanzare, allo scoperto.", // 6... Ke7
      "Cavallo in d5: scacco matto con due soli pezzi minori. La collaborazione vale più della Donna.", // 7. Nd5#
    ],
  },
];

export function findGuided(slug: string): GuidedGame | undefined {
  return GUIDED_GAMES.find((g) => g.slug === slug);
}
