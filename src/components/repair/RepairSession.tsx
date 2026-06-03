"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { PuzzleSolver } from "@/components/tactics/PuzzleSolver";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { recordAttempt } from "@/app/app/tattiche/actions";
import type { Puzzle, SolveResult } from "@/lib/tactics/types";

export interface RepairSessionProps {
  puzzles: Puzzle[];
  motifLabel: string;
  gameId: string;
}

/**
 * Mini-lezione di riparazione: risolvi in sequenza i puzzle mirati all'errore.
 * Riusa `PuzzleSolver` e `recordAttempt` (i puzzle contano anche per rating
 * tattico e progressi per tema). Alla fine, riepilogo + invito a ritentare.
 */
export function RepairSession({ puzzles, motifLabel, gameId }: RepairSessionProps) {
  const { toast } = useToast();
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<boolean[]>([]);
  const [done, setDone] = useState(false);

  const total = puzzles.length;
  const current = puzzles[index];

  const handleSolved = useCallback(
    async (result: SolveResult) => {
      const puzzle = puzzles[index];
      setResults((r) => [...r, result.clean]);

      const res = await recordAttempt({
        ...result,
        puzzleId: puzzle.id,
        puzzleRating: puzzle.rating,
        themes: puzzle.themes,
        fromReview: false,
      });
      if (!res.ok) {
        toast({ title: "Salvataggio non riuscito", description: res.error, variant: "error" });
      }

      window.setTimeout(() => {
        if (index + 1 >= total) setDone(true);
        else setIndex((i) => i + 1);
      }, 1000);
    },
    [index, puzzles, total, toast],
  );

  if (done) {
    const solved = results.filter(Boolean).length;
    return (
      <Card>
        <CardHeader>
          <CardTitle>Mini-lezione completata</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-text-muted">
            Risolti puliti <span className="font-mono text-text">{solved}</span> di {total} puzzle
            sul motivo <strong>{motifLabel}</strong>.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => window.location.reload()}>Ritenta con nuovi puzzle</Button>
            <Link href={`/app/partite/${gameId}`}>
              <Button variant="secondary">Torna alla partita</Button>
            </Link>
            <Link href="/app/ripara">
              <Button variant="ghost">Altri errori</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Badge variant="muted">{motifLabel}</Badge>
        <span className="font-mono text-sm text-text-muted">
          puzzle {index + 1} di {total}
        </span>
      </div>
      <div className="mx-auto w-full max-w-xl">
        <PuzzleSolver key={current.id} puzzle={current} onSolved={handleSolved} />
      </div>
    </div>
  );
}
