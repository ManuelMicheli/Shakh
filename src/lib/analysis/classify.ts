/**
 * Classificazione di una semimossa — deterministica, basata SOLO sul motore.
 * Nessun linguaggio naturale, nessuna AI (quelli sono il prompt 04).
 *
 * Idea: `loss = eval_best − eval_played` dal punto di vista di chi muove.
 * I matti sono gestiti esplicitamente (non come centipawn grezzi enormi).
 */

import type { Classification } from "@/lib/games/types";
import { CLASSIFICATION_THRESHOLDS, WINNING_THRESHOLD } from "./thresholds";
import { type PovEval, toMoverCp } from "./evalScore";

export interface ClassifyInput {
  /** Valutazione (white-relative) PRIMA della mossa = valore col gioco migliore. */
  evalBefore: PovEval;
  /** Valutazione (white-relative) DOPO la mossa effettivamente giocata. */
  evalAfter: PovEval;
  moverIsWhite: boolean;
  /** Mossa giocata e mossa migliore del motore, in UCI (per il match "best"). */
  playedUci: string;
  bestUci: string;
}

/** True se la PovEval è un matto a favore di chi muove. */
function isMateForMover(e: PovEval, moverIsWhite: boolean): boolean {
  return e.type === "mate" && (moverIsWhite ? e.value > 0 : e.value < 0);
}

/** True se la PovEval è un matto contro chi muove. */
function isMateAgainstMover(e: PovEval, moverIsWhite: boolean): boolean {
  return e.type === "mate" && (moverIsWhite ? e.value < 0 : e.value > 0);
}

export function classifyMove({
  evalBefore,
  evalAfter,
  moverIsWhite,
  playedUci,
  bestUci,
}: ClassifyInput): Classification {
  // La mossa coincide col motore: è la migliore, niente perdita.
  if (playedUci && bestUci && playedUci === bestUci) return "best";

  // --- Regole sui matti (prevalgono sui centipawn) ---
  const hadForcedMate = isMateForMover(evalBefore, moverIsWhite);
  const stillHasMate = isMateForMover(evalAfter, moverIsWhite);
  // Aveva matto forzato e l'ha buttato via → blunder a prescindere.
  if (hadForcedMate && !stillHasMate) return "blunder";

  const wasGettingMated = isMateAgainstMover(evalBefore, moverIsWhite);
  const nowGettingMated = isMateAgainstMover(evalAfter, moverIsWhite);
  // È entrato in un matto subìto che prima non c'era → blunder.
  if (nowGettingMated && !wasGettingMated) return "blunder";

  // --- Perdita in centipawn ---
  const bestCp = toMoverCp(evalBefore, moverIsWhite);
  const playedCp = toMoverCp(evalAfter, moverIsWhite);
  const loss = Math.max(0, bestCp - playedCp);

  // Posizione già schiacciante a favore di chi muove: non drammatizzare un calo
  // (es. +8 → +6). Se prima e dopo si resta ben oltre la soglia, resta "good".
  if (playedCp >= WINNING_THRESHOLD && bestCp >= WINNING_THRESHOLD) return "good";

  if (loss >= CLASSIFICATION_THRESHOLDS.blunder) return "blunder";
  if (loss >= CLASSIFICATION_THRESHOLDS.mistake) return "mistake";
  if (loss >= CLASSIFICATION_THRESHOLDS.inaccuracy) return "inaccuracy";

  // 'book' (apertura nota) sarà popolato col l'opening explorer del prompt 06.
  return "good";
}
