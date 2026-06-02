/**
 * Codifica/decodifica delle valutazioni per la persistenza e il confronto.
 *
 * Le colonne `eval_before`/`eval_after` sono numeriche singole: il matto va
 * quindi codificato dentro un numero. Manteniamo sempre il punto di vista del
 * BIANCO (white-relative), coerente con `score.ts` del prompt 02.
 */

import type { ScoreType } from "@/lib/engine/score";
import { MATE_SCORE } from "./thresholds";

/** Valutazione white-relative: cp in centipawn, oppure mate = mosse al matto (segno = chi matta). */
export interface PovEval {
  type: ScoreType;
  value: number;
}

/** Comprime una PovEval in un singolo numero salvabile su DB. */
export function encodeEval(e: PovEval): number {
  if (e.type === "mate") {
    const sign = e.value >= 0 ? 1 : -1;
    return sign * (MATE_SCORE - Math.abs(e.value));
  }
  return Math.round(e.value);
}

/** Ricostruisce la PovEval da un numero salvato. */
export function decodeEval(n: number): PovEval {
  if (Math.abs(n) >= MATE_SCORE - 1000) {
    const moves = MATE_SCORE - Math.abs(n);
    return { type: "mate", value: (n >= 0 ? 1 : -1) * moves };
  }
  return { type: "cp", value: n };
}

/**
 * Converte una PovEval white-relative in cp dal punto di vista di chi muove.
 * Il matto diventa un cp molto grande (segno = se chi muove matta o è mattato),
 * con i matti più vicini leggermente più alti, così i confronti restano monotoni.
 */
export function toMoverCp(e: PovEval, moverIsWhite: boolean): number {
  const sign = moverIsWhite ? 1 : -1;
  if (e.type === "mate") {
    const moverMoves = sign * e.value; // >0: chi muove dà matto; <0: subisce matto
    const magnitude = MATE_SCORE - Math.abs(moverMoves) * 10;
    return moverMoves >= 0 ? magnitude : -magnitude;
  }
  return sign * e.value;
}

/** cp white-relative limitato (per il grafico): il matto satura al cap. */
export function toWhiteCpClamped(e: PovEval, cap = 1000): number {
  if (e.type === "mate") return e.value >= 0 ? cap : -cap;
  return Math.max(-cap, Math.min(cap, e.value));
}
