"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { saveGameForReview } from "@/app/app/gioca/actions";

export interface PlayedGameInput {
  pgn: string;
  white: string;
  black: string;
  /** "1-0" | "0-1" | "1/2-1/2" | "*" */
  result: string;
  userColor: "w" | "b";
}

/**
 * Salva la partita appena giocata e apre la schermata di analisi con auto-avvio
 * (`?analyze=1`). Usato dai pulsanti "Analyze game" di sparring/hotseat/online.
 */
export function useAnalyzePlayedGame() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(
    async (input: PlayedGameInput) => {
      if (loading) return;
      setLoading(true);
      setError(null);
      const res = await saveGameForReview(input);
      if (res.ok) {
        router.push(`/app/partite/${res.data.id}?analyze=1`);
      } else {
        setError(res.error);
        setLoading(false);
      }
    },
    [loading, router],
  );

  return { analyze, loading, error };
}
