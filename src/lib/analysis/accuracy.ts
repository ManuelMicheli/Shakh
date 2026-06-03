/**
 * Riepilogo della partita: conteggi per categoria e stima di accuratezza per lato.
 *
 * NB: la percentuale di accuratezza è una STIMA semplice, derivata dalla perdita
 * media in centipawn. NON è lo standard ufficiale di Lichess/Chess.com (che si
 * basano su win% e medie ponderate). Serve a dare un ordine di grandezza.
 */

import type { AnalysisRow } from "@/lib/games/types";
import { decodeEval, toMoverCp } from "./evalScore";

export interface SideSummary {
  moves: number;
  inaccuracy: number;
  mistake: number;
  miss: number;
  blunder: number;
  /** Perdita media in centipawn. */
  avgLoss: number;
  /** Stima 0..100 (vedi nota sul metodo). */
  accuracy: number;
}

export interface GameSummary {
  white: SideSummary;
  black: SideSummary;
}

/** Stima accuratezza da perdita media: 0cp → 100%, decade dolcemente. */
function accuracyFromAvgLoss(avgLossCp: number): number {
  const acc = 100 * Math.exp(-avgLossCp / 250);
  return Math.round(Math.max(0, Math.min(100, acc)));
}

function emptyAcc() {
  return { moves: 0, inaccuracy: 0, mistake: 0, miss: 0, blunder: 0, totalLoss: 0 };
}

export function summarizeGame(rows: AnalysisRow[]): GameSummary {
  const acc = { white: emptyAcc(), black: emptyAcc() };

  for (const row of rows) {
    const side = row.ply % 2 === 1 ? acc.white : acc.black;
    side.moves += 1;
    if (row.classification === "inaccuracy") side.inaccuracy += 1;
    else if (row.classification === "mistake") side.mistake += 1;
    else if (row.classification === "miss") side.miss += 1;
    else if (row.classification === "blunder") side.blunder += 1;

    if (row.eval_before != null && row.eval_after != null) {
      const moverIsWhite = row.ply % 2 === 1;
      const before = toMoverCp(decodeEval(row.eval_before), moverIsWhite);
      const after = toMoverCp(decodeEval(row.eval_after), moverIsWhite);
      // Limita per non far esplodere la media coi matti.
      side.totalLoss += Math.max(0, Math.min(1500, before - after));
    }
  }

  const finalize = (s: ReturnType<typeof emptyAcc>): SideSummary => {
    const avgLoss = s.moves > 0 ? s.totalLoss / s.moves : 0;
    return {
      moves: s.moves,
      inaccuracy: s.inaccuracy,
      mistake: s.mistake,
      miss: s.miss,
      blunder: s.blunder,
      avgLoss: Math.round(avgLoss),
      accuracy: accuracyFromAvgLoss(avgLoss),
    };
  };

  return { white: finalize(acc.white), black: finalize(acc.black) };
}
