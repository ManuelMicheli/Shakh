/**
 * Pool di valutazione: parallelizza l'analisi della partita su PIÙ worker
 * Stockfish indipendenti.
 *
 * Ogni `EngineService` possiede un worker single-thread separato (vedi engine.ts):
 * il parallelismo nasce dall'avere N worker distinti, NON da SharedArrayBuffer →
 * nessun header COOP/COEP richiesto (vincolo di prompt 02). Costo: ogni worker
 * carica ~40MB di rete NNUE, perciò il pool è limitato in base a CPU/RAM.
 */

"use client";

import { Chess } from "chess.js";
import { EngineService } from "@/lib/engine/engine";
import { toWhiteRelative } from "@/lib/engine/score";
import type { PovEval } from "./evalScore";

export interface PositionEval {
  eval: PovEval;
  bestUci: string;
}

export interface EvalPositionsOptions {
  depth: number;
  /** Se presente, valuta SOLO questi indici; gli altri restano `null`. */
  needed?: Set<number>;
  /** Notifica il numero di posizioni completate (cumulativo). */
  onProgress?: (doneCount: number) => void;
  /** Ritorna `true` per annullare: controllato tra una posizione e l'altra. */
  signal?: () => boolean;
  /** Override della dimensione del pool (default: auto dal device). */
  poolSize?: number;
}

/** Valutazione di una posizione terminale, senza scomodare il motore. */
function terminalEval(chess: Chess): PovEval | null {
  if (chess.isCheckmate()) {
    // Il lato al tratto è mattato: l'altro ha dato matto adesso.
    const whiteDelivers = chess.turn() === "b";
    return { type: "mate", value: whiteDelivers ? 1 : -1 };
  }
  if (chess.isStalemate() || chess.isDraw() || chess.isInsufficientMaterial()) {
    return { type: "cp", value: 0 };
  }
  return null;
}

/** Eval neutra usata quando il motore fallisce su una posizione (non fatale). */
const NEUTRAL: PositionEval = { eval: { type: "cp", value: 0 }, bestUci: "" };

/**
 * Sceglie il numero di worker in base a core CPU e memoria del device.
 * Ogni worker carica ~40MB di rete NNUE: prudenti su device con poca RAM.
 */
export function pickPoolSize(): number {
  if (typeof navigator === "undefined") return 1;
  const cores = navigator.hardwareConcurrency ?? 4;
  let n = Math.min(4, Math.max(1, cores - 1));
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  if (typeof mem === "number" && mem <= 4) n = Math.min(n, 2);
  return n;
}

/** Valuta una singola posizione (terminale → motore). Non lancia mai. */
async function evalOne(
  svc: EngineService,
  fen: string,
  depth: number,
): Promise<PositionEval> {
  const view = new Chess(fen);
  const term = terminalEval(view);
  if (term) return { eval: term, bestUci: "" };
  try {
    const evaluation = await svc.analyze(fen, { depth }).result;
    const top = evaluation.lines[0];
    const value = top ? toWhiteRelative(top.score, top.scoreType, view.turn()) : 0;
    return {
      eval: { type: top?.scoreType ?? "cp", value },
      bestUci: evaluation.bestMove,
    };
  } catch {
    // Errore del motore su QUESTA posizione: eval neutra e si prosegue.
    return NEUTRAL;
  }
}

/**
 * Valuta le posizioni con un pool di worker. Gli indici vengono distribuiti
 * via una coda condivisa (ogni worker libero prende il successivo). Ritorna un
 * array allineato a `fens` (`null` sugli indici non richiesti o non valutati).
 */
export async function evalPositions(
  fens: string[],
  opts: EvalPositionsOptions,
): Promise<(PositionEval | null)[]> {
  const total = fens.length;
  const results: (PositionEval | null)[] = new Array(total).fill(null);
  const indices = opts.needed
    ? [...opts.needed].filter((i) => i >= 0 && i < total).sort((a, b) => a - b)
    : Array.from({ length: total }, (_, i) => i);
  if (indices.length === 0) return results;

  const poolSize = Math.max(1, opts.poolSize ?? pickPoolSize());
  const workers = Array.from(
    { length: Math.min(poolSize, indices.length) },
    () => new EngineService(),
  );

  let cursor = 0;
  let done = 0;
  let aborted = false;

  async function runWorker(svc: EngineService) {
    while (true) {
      if (aborted || opts.signal?.()) {
        aborted = true;
        return;
      }
      const k = cursor++;
      if (k >= indices.length) return;
      const i = indices[k];
      results[i] = await evalOne(svc, fens[i], opts.depth);
      done++;
      opts.onProgress?.(done);
    }
  }

  try {
    await Promise.all(workers.map((w) => runWorker(w)));
  } finally {
    for (const w of workers) {
      try {
        w.quit(); // libera la RAM della rete NNUE
      } catch {
        // ignora
      }
    }
  }
  return results;
}
