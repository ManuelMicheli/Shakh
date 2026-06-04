"use client";

import { useEffect, useState } from "react";
import { analyzeGame } from "./pipeline";
import type { AnalysisRowInput, Classification } from "@/lib/games/types";

/** Quali mosse conteggiare: Bianco, Nero, oppure entrambe divise per colore. */
export type BreakdownSide = "w" | "b" | "both";

/** Ordine di presentazione (dal più bello al più grave); 'book' in coda. */
const ORDER: Classification[] = [
  "brilliant",
  "great",
  "best",
  "excellent",
  "good",
  "inaccuracy",
  "mistake",
  "miss",
  "blunder",
  "book",
];

export interface BreakdownGroup {
  /** Etichetta del gruppo (es. "White"); assente se gruppo unico. */
  label?: string;
  items: { c: Classification; n: number }[];
  total: number;
}

export interface GameBreakdown {
  loading: boolean;
  failed: boolean;
  groups: BreakdownGroup[] | null;
}

function tally(rows: AnalysisRowInput[], moverIsWhite: boolean): BreakdownGroup {
  const counts = new Map<Classification, number>();
  let total = 0;
  for (const r of rows) {
    if ((r.ply % 2 === 1) !== moverIsWhite) continue;
    if (!r.classification) continue;
    counts.set(r.classification, (counts.get(r.classification) ?? 0) + 1);
    total += 1;
  }
  const items = ORDER.filter((c) => counts.get(c)).map((c) => ({ c, n: counts.get(c)! }));
  return { items, total };
}

/**
 * Analizza la partita conclusa (depth 15) e restituisce il conteggio delle
 * mosse per classificazione, dal lato richiesto. Pensato per la schermata di
 * fine partita: parte solo quando `enabled` e annulla se il componente si smonta
 * o la partita cambia.
 */
export function useGameBreakdown(
  enabled: boolean,
  pgn: string | null,
  side: BreakdownSide,
): GameBreakdown {
  const [state, setState] = useState<GameBreakdown>({
    loading: false,
    failed: false,
    groups: null,
  });

  useEffect(() => {
    if (!enabled || !pgn) {
      setState({ loading: false, failed: false, groups: null });
      return;
    }
    let cancelled = false;
    setState({ loading: true, failed: false, groups: null });

    analyzeGame(pgn, { depth: 15, signal: () => cancelled })
      .then(({ rows, aborted }) => {
        if (cancelled || aborted) return;
        const groups: BreakdownGroup[] =
          side === "both"
            ? [
                { label: "White", ...tally(rows, true) },
                { label: "Black", ...tally(rows, false) },
              ]
            : [tally(rows, side === "w")];
        setState({ loading: false, failed: false, groups });
      })
      .catch(() => {
        if (!cancelled) setState({ loading: false, failed: true, groups: null });
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, pgn, side]);

  return state;
}
