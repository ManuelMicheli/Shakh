"use client";

import { useEffect, useRef, useState } from "react";
import {
  engine,
  type AnalysisHandle,
  type EngineEvaluation,
  type EngineState,
} from "./engine";

export interface UseEngineAnalysisOptions {
  /** Se false, non analizza (risparmia CPU). */
  enabled?: boolean;
  depth?: number;
  movetime?: number;
  multiPV?: number;
  /** Ritardo prima di lanciare l'analisi al cambio di FEN. */
  debounceMs?: number;
}

export interface UseEngineAnalysisResult {
  evaluation: EngineEvaluation | null;
  isThinking: boolean;
  engineState: EngineState;
  depth: number;
}

/**
 * Analizza la posizione corrente (FEN). Avvia al cambio di FEN con debounce,
 * aggiorna in tempo reale, cancella la precedente, traccia lo stato del motore.
 * Accendibile/spegnibile via `enabled` per non sprecare CPU.
 */
export function useEngineAnalysis(
  fen: string,
  {
    enabled = false,
    depth = 16,
    movetime,
    multiPV = 1,
    debounceMs = 250,
  }: UseEngineAnalysisOptions = {},
): UseEngineAnalysisResult {
  const [evaluation, setEvaluation] = useState<EngineEvaluation | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [engineState, setEngineState] = useState<EngineState>(engine.state);
  const cancelledRef = useRef(false);
  const handleRef = useRef<AnalysisHandle | null>(null);

  useEffect(() => {
    if (!enabled) {
      setIsThinking(false);
      return;
    }

    cancelledRef.current = false;
    setEvaluation(null);

    const timer = setTimeout(() => {
      setIsThinking(true);
      setEngineState(engine.state);

      const handle = engine.analyze(fen, { depth, movetime, multiPV });
      handleRef.current = handle;

      handle.onUpdate((partial) => {
        if (cancelledRef.current) return;
        setEvaluation(partial);
        setEngineState(engine.state);
      });

      handle.result
        .then((result) => {
          if (cancelledRef.current) return;
          setEvaluation(result);
          setIsThinking(false);
          setEngineState(engine.state);
        })
        .catch((err: Error) => {
          // Analisi soppiantata o cancellata: nessun errore reale.
          if (err.message === "superseded" || err.message === "cancelled") return;
          if (cancelledRef.current) return;
          setEngineState("error");
          setIsThinking(false);
        });
    }, debounceMs);

    return () => {
      cancelledRef.current = true;
      clearTimeout(timer);
      handleRef.current?.cancel();
      handleRef.current = null;
    };
  }, [fen, enabled, depth, movetime, multiPV, debounceMs]);

  return {
    evaluation,
    isThinking,
    engineState,
    depth: evaluation?.depth ?? 0,
  };
}
