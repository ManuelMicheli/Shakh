/**
 * Pipeline d'analisi di una partita (lato client).
 *
 * Ricostruisce la linea dal PGN, valuta le posizioni con il pool di worker
 * (`evalPositions`), classifica ogni semimossa e produce le righe da salvare.
 * Robusta: una posizione che fallisce nel motore riceve eval neutra e NON aborta
 * il job. Con `savedPlies` salta i ply già su DB (ripresa dopo reload).
 */

"use client";

import { Chess, type Square, type PieceSymbol } from "chess.js";
import { classifyMove } from "./classify";
import { encodeEval } from "./evalScore";
import { evalPositions } from "./enginePool";
import { ANALYSIS_DEPTH } from "./thresholds";
import type { AnalysisRowInput } from "@/lib/games/types";

export interface AnalyzeGameOptions {
  depth?: number;
  /** Ply già presenti su DB: vengono saltati (ripresa). */
  savedPlies?: Set<number>;
  /** Avanzamento: posizioni valutate / posizioni totali da valutare. */
  onProgress?: (current: number, total: number) => void;
  /** Annullamento cooperativo (controllato durante la valutazione). */
  signal?: () => boolean;
  /** Salvataggio progressivo dei lotti di righe. */
  onBatch?: (rows: AnalysisRowInput[]) => void | Promise<void>;
  batchSize?: number;
}

export interface AnalyzeGameResult {
  rows: AnalysisRowInput[];
  /** True se interrotta da `signal` prima di completare. */
  aborted: boolean;
}

/** Errori distinti per messaggi mirati a monte. */
export class InvalidPgnError extends Error {}
export class EmptyGameError extends Error {}

function uciToSan(fen: string, uci: string): string | null {
  if (!uci || uci.length < 4) return null;
  const chess = new Chess(fen);
  try {
    const m = chess.move({
      from: uci.slice(0, 2) as Square,
      to: uci.slice(2, 4) as Square,
      promotion: uci.length > 4 ? (uci[4] as PieceSymbol) : undefined,
    });
    return m.san;
  } catch {
    return null;
  }
}

export async function analyzeGame(
  pgn: string,
  opts: AnalyzeGameOptions = {},
): Promise<AnalyzeGameResult> {
  const depth = opts.depth ?? ANALYSIS_DEPTH;
  const batchSize = opts.batchSize ?? 6;
  const saved = opts.savedPlies ?? new Set<number>();

  const chess = new Chess();
  try {
    chess.loadPgn(pgn);
  } catch {
    throw new InvalidPgnError("Invalid PGN.");
  }
  const verbose = chess.history({ verbose: true });
  const n = verbose.length;
  if (n === 0) throw new EmptyGameError("The game contains no moves.");

  // posFens[i] = posizione dopo i semimosse (posFens[0] = iniziale).
  const posFens: string[] = [verbose[0].before, ...verbose.map((m) => m.after)];

  // Ply da (ri)calcolare: quelli non ancora salvati.
  const plies: number[] = [];
  for (let p = 1; p <= n; p++) if (!saved.has(p)) plies.push(p);

  // Posizioni necessarie: per ogni ply mancante servono {p-1, p}.
  const needed = new Set<number>();
  for (const p of plies) {
    needed.add(p - 1);
    needed.add(p);
  }

  const evals = await evalPositions(posFens, {
    depth,
    needed,
    onProgress: (doneCount) => opts.onProgress?.(doneCount, needed.size),
    signal: opts.signal,
  });

  const aborted = Boolean(opts.signal?.());

  const rows: AnalysisRowInput[] = [];
  let batch: AnalysisRowInput[] = [];
  for (const ply of plies) {
    const before = evals[ply - 1];
    const after = evals[ply];
    if (!before || !after) continue; // posizione non valutata (annullamento)
    const move = verbose[ply - 1];
    const moverIsWhite = ply % 2 === 1;
    const playedUci = `${move.from}${move.to}${move.promotion ?? ""}`;
    const classification = classifyMove({
      evalBefore: before.eval,
      evalAfter: after.eval,
      moverIsWhite,
      playedUci,
      bestUci: before.bestUci,
    });
    const row: AnalysisRowInput = {
      ply,
      san: move.san,
      fen: move.after,
      eval_before: encodeEval(before.eval),
      eval_after: encodeEval(after.eval),
      best_move_san: before.bestUci ? uciToSan(move.before, before.bestUci) : null,
      classification,
    };
    rows.push(row);
    batch.push(row);
    if (opts.onBatch && batch.length >= batchSize) {
      await opts.onBatch(batch);
      batch = [];
    }
  }
  if (opts.onBatch && batch.length > 0) await opts.onBatch(batch);

  return { rows, aborted };
}
