/**
 * Aggiornamento del rating tattico: Elo classico con un fattore K modulato
 * dall'incertezza (deviazione), ispirato a Glicko ma volutamente semplice.
 *
 * - Successo contro un puzzle di rating più alto → guadagno maggiore.
 * - Fallimento contro un puzzle di rating più basso → perdita maggiore.
 * - Più alta è la deviazione (utente nuovo / incerto) → swing più ampi.
 */

const RD_FLOOR = 70;
const RD_START = 350;

/** Punteggio atteso (0..1) del giocatore contro il puzzle, formula Elo. */
export function expectedScore(playerRating: number, puzzleRating: number): number {
  return 1 / (1 + Math.pow(10, (puzzleRating - playerRating) / 400));
}

/** Fattore K in funzione della deviazione: 16 (certo) → 64 (molto incerto). */
export function kFactor(ratingDeviation: number): number {
  const k = 16 + (ratingDeviation / RD_START) * 48;
  return Math.round(Math.min(64, Math.max(16, k)));
}

/** Nuovo rating dopo un tentativo (`won` = risolto correttamente). */
export function updateRating(
  playerRating: number,
  puzzleRating: number,
  won: boolean,
  k: number,
): number {
  const expected = expectedScore(playerRating, puzzleRating);
  const score = won ? 1 : 0;
  return Math.round(playerRating + k * (score - expected));
}

/** La deviazione si restringe a ogni tentativo (più dati → più certezza). */
export function nextDeviation(ratingDeviation: number): number {
  return Math.max(RD_FLOOR, Math.round(ratingDeviation * 0.96));
}
