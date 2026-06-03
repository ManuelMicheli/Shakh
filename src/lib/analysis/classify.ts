/**
 * Classificazione di una semimossa — deterministica, basata SOLO sul motore.
 * Nessun linguaggio naturale, nessuna AI (quelli sono il prompt 04).
 *
 * Idea: `loss = eval_best − eval_played` dal punto di vista di chi muove.
 * I matti sono gestiti esplicitamente (non come centipawn grezzi enormi).
 */

import type { Classification } from "@/lib/games/types";
import {
  CLASSIFICATION_THRESHOLDS,
  GREAT_GAIN,
  MISS_WIN_THRESHOLD,
  WINNING_THRESHOLD,
} from "./thresholds";
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
  const bestCp = toMoverCp(evalBefore, moverIsWhite);
  const playedCp = toMoverCp(evalAfter, moverIsWhite);

  // La mossa coincide col motore: è la migliore.
  if (playedUci && bestUci && playedUci === bestUci) {
    // "great" (Grande): mossa migliore che ATTIVAMENTE ribalta/migliora di molto
    // la posizione (tattica trovata), purché non si fosse già in vantaggio deciso.
    const gain = playedCp - bestCp;
    if (gain >= GREAT_GAIN && bestCp < WINNING_THRESHOLD) return "great";
    return "best";
  }

  // --- Regole sui matti (prevalgono sui centipawn) ---
  const hadForcedMate = isMateForMover(evalBefore, moverIsWhite);
  const stillHasMate = isMateForMover(evalAfter, moverIsWhite);
  // Aveva matto forzato e l'ha buttato via → occasione mancata.
  if (hadForcedMate && !stillHasMate) return "miss";

  const wasGettingMated = isMateAgainstMover(evalBefore, moverIsWhite);
  const nowGettingMated = isMateAgainstMover(evalAfter, moverIsWhite);
  // È entrato in un matto subìto che prima non c'era → blunder.
  if (nowGettingMated && !wasGettingMated) return "blunder";

  // --- Perdita in centipawn ---
  const loss = Math.max(0, bestCp - playedCp);

  // Posizione già schiacciante a favore di chi muove: non drammatizzare un calo
  // (es. +8 → +6). Se prima e dopo si resta ben oltre la soglia, resta "good".
  if (playedCp >= WINNING_THRESHOLD && bestCp >= WINNING_THRESHOLD) return "good";

  // "miss" (Mossa mancata): c'era un'occasione vincente (la migliore portava
  // ben oltre la soglia di vantaggio) e l'ha sprecata con una perdita da errore.
  if (
    bestCp >= MISS_WIN_THRESHOLD &&
    playedCp < MISS_WIN_THRESHOLD &&
    loss >= CLASSIFICATION_THRESHOLDS.mistake
  )
    return "miss";

  if (loss >= CLASSIFICATION_THRESHOLDS.blunder) return "blunder";
  if (loss >= CLASSIFICATION_THRESHOLDS.mistake) return "mistake";
  if (loss >= CLASSIFICATION_THRESHOLDS.inaccuracy) return "inaccuracy";
  if (loss >= CLASSIFICATION_THRESHOLDS.excellent) return "good";

  // Perdita minima ma non è la mossa del motore → "excellent" (Ottima).
  // 'book' (apertura nota) sarà popolato con l'opening explorer del prompt 06.
  return "excellent";
}
