"use client";

import { useCallback, useRef, useState } from "react";
import { Chess, type Square, type PieceSymbol } from "chess.js";
import { engine } from "@/lib/engine/engine";
import { toWhiteRelative } from "@/lib/engine/score";
import { classifyMove } from "./classify";
import { encodeEval, type PovEval } from "./evalScore";
import { fetchCloudEval } from "./cloudEval";
import { ANALYSIS_DEPTH } from "./thresholds";
import type { AnalysisRowInput } from "@/lib/games/types";

export type AnalysisStatus = "idle" | "running" | "done" | "error";

export interface AnalysisProgress {
  current: number;
  total: number;
}

export interface RunOptions {
  depth?: number;
  /** Consulta la cloud eval di Lichess prima del motore locale (default false). */
  useCloud?: boolean;
  /** Salvataggio progressivo: chiamata con i lotti di righe man mano che sono pronte. */
  onBatch?: (rows: AnalysisRowInput[]) => void | Promise<void>;
  /** Dimensione del lotto per `onBatch`. */
  batchSize?: number;
}

interface PositionEval {
  eval: PovEval;
  bestUci: string;
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

/**
 * Job di analisi mossa-per-mossa nel worker Stockfish (lato client).
 * Valuta ogni POSIZIONE una sola volta (la posizione "dopo" una mossa è la
 * posizione "prima" della successiva), dimezzando le chiamate al motore.
 */
export function useGameAnalysis() {
  const [status, setStatus] = useState<AnalysisStatus>("idle");
  const [progress, setProgress] = useState<AnalysisProgress>({ current: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef(false);

  const cancel = useCallback(() => {
    abortRef.current = true;
  }, []);

  const run = useCallback(
    async (pgn: string, opts: RunOptions = {}): Promise<AnalysisRowInput[]> => {
      const depth = opts.depth ?? ANALYSIS_DEPTH;
      const batchSize = opts.batchSize ?? 6;
      abortRef.current = false;
      setError(null);
      setStatus("running");

      // 1) Ricostruisci la linea: posizioni 0..N e le mosse giocate.
      const chess = new Chess();
      try {
        chess.loadPgn(pgn);
      } catch {
        setStatus("error");
        setError("PGN non valido.");
        return [];
      }
      const verbose = chess.history({ verbose: true });
      const n = verbose.length;
      if (n === 0) {
        setStatus("error");
        setError("La partita non contiene mosse.");
        return [];
      }

      // posFens[i] = posizione dopo i semimosse (posFens[0] = iniziale).
      const posFens: string[] = [verbose[0].before, ...verbose.map((m) => m.after)];
      const total = posFens.length;
      setProgress({ current: 0, total });

      // 2) Valuta ogni posizione una volta.
      const evals: PositionEval[] = new Array(total);
      for (let i = 0; i < total; i++) {
        if (abortRef.current) {
          setStatus("idle");
          return [];
        }
        const fen = posFens[i];
        const view = new Chess(fen);
        const term = terminalEval(view);
        if (term) {
          evals[i] = { eval: term, bestUci: "" };
        } else {
          let resolved: PositionEval | null = null;
          if (opts.useCloud) {
            const cloud = await fetchCloudEval(fen);
            if (cloud) resolved = { eval: cloud.eval, bestUci: cloud.bestUci };
          }
          if (!resolved) {
            try {
              const evaluation = await engine.analyze(fen, { depth }).result;
              const top = evaluation.lines[0];
              const value = top
                ? toWhiteRelative(top.score, top.scoreType, view.turn())
                : 0;
              resolved = {
                eval: { type: top?.scoreType ?? "cp", value },
                bestUci: evaluation.bestMove,
              };
            } catch {
              setStatus("error");
              setError("Errore del motore durante l'analisi.");
              return [];
            }
          }
          evals[i] = resolved;
        }
        setProgress({ current: i + 1, total });
      }

      // 3) Costruisci le righe per ogni semimossa, salvando a lotti.
      const rows: AnalysisRowInput[] = [];
      let batch: AnalysisRowInput[] = [];
      for (let ply = 1; ply <= n; ply++) {
        const move = verbose[ply - 1];
        const before = evals[ply - 1];
        const after = evals[ply];
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
          best_move_san: before.bestUci
            ? uciToSan(move.before, before.bestUci)
            : null,
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

      setStatus("done");
      return rows;
    },
    [],
  );

  return { status, progress, error, run, cancel };
}
