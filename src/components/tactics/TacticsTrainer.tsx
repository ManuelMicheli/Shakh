"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PuzzleSolver } from "./PuzzleSolver";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { getNextPuzzle, recordAttempt } from "@/app/app/tattiche/actions";
import { themeLabel } from "@/lib/tactics/themes";
import type { Puzzle, SolveResult, TacticMode, TacticStats } from "@/lib/tactics/types";

const MODE_TITLE: Record<TacticMode, string> = {
  adaptive: "Adattivo",
  theme: "Per tema",
  review: "Ripasso",
  timed: "Sfida a tempo",
};

/** Durata della sfida a tempo (secondi). */
const TIMED_DURATION = 180;
/** Quanto sale il rating bersaglio per ogni puzzle risolto, nella sfida. */
const TIMED_RAMP = 20;
/** Pausa prima del passaggio automatico al puzzle successivo (ms). */
const ADVANCE_DELAY = 1100;

export interface TacticsTrainerProps {
  mode: TacticMode;
  theme: string | null;
  initialPuzzle: Puzzle | null;
  initialStats: TacticStats;
}

export function TacticsTrainer({ mode, theme, initialPuzzle, initialStats }: TacticsTrainerProps) {
  const { toast } = useToast();
  const [puzzle, setPuzzle] = useState<Puzzle | null>(initialPuzzle);
  const [stats, setStats] = useState<TacticStats>(initialStats);
  const [sessionSolved, setSessionSolved] = useState(0);
  const [loading, setLoading] = useState(false);
  const [justSolved, setJustSolved] = useState<SolveResult | null>(null);

  // Sfida a tempo.
  const isTimed = mode === "timed";
  const [timeLeft, setTimeLeft] = useState(TIMED_DURATION);
  const [finished, setFinished] = useState(false);
  const finishedRef = useRef(false);

  const seenRef = useRef<Set<string>>(
    new Set(initialPuzzle ? [initialPuzzle.id] : []),
  );
  const advanceTimer = useRef<number | null>(null);

  // Countdown della sfida a tempo.
  useEffect(() => {
    if (!isTimed) return;
    const id = window.setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          finishedRef.current = true;
          setFinished(true);
          window.clearInterval(id);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [isTimed]);

  useEffect(() => {
    return () => {
      if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
    };
  }, []);

  const loadNext = useCallback(async () => {
    if (finishedRef.current) return;
    setJustSolved(null);
    setLoading(true);
    const targetRating = isTimed ? stats.rating + sessionSolved * TIMED_RAMP : undefined;
    const next = await getNextPuzzle({
      mode,
      theme,
      targetRating,
      excludeIds: Array.from(seenRef.current),
    });
    if (next) seenRef.current.add(next.id);
    setPuzzle(next);
    setLoading(false);
  }, [isTimed, stats.rating, sessionSolved, mode, theme]);

  const handleSolved = useCallback(
    async (result: SolveResult) => {
      if (!puzzle || finishedRef.current) return;
      setJustSolved(result);
      setSessionSolved((n) => n + 1);

      const res = await recordAttempt({
        ...result,
        puzzleId: puzzle.id,
        puzzleRating: puzzle.rating,
        themes: puzzle.themes,
        fromReview: mode === "review",
      });
      if (res.ok && res.stats) setStats(res.stats);
      else if (!res.ok) {
        toast({ title: "Salvataggio non riuscito", description: res.error, variant: "error" });
      }

      // Passaggio fluido al puzzle successivo.
      if (!finishedRef.current) {
        advanceTimer.current = window.setTimeout(() => void loadNext(), ADVANCE_DELAY);
      }
    },
    [puzzle, mode, toast, loadNext],
  );

  const skip = useCallback(() => {
    if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
    void loadNext();
  }, [loadNext]);

  const advanceNow = useCallback(() => {
    if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
    void loadNext();
  }, [loadNext]);

  // --- Stati terminali ---
  if (finished) {
    return (
      <Shell mode={mode} theme={theme}>
        <Card>
          <CardHeader>
            <CardTitle>Tempo scaduto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-text-muted">
              Hai risolto <span className="font-mono text-text">{sessionSolved}</span> puzzle in{" "}
              {TIMED_DURATION / 60} minuti.
            </p>
            <p className="text-sm text-text-muted">
              Miglior serie: <span className="font-mono text-text">{stats.bestStreak}</span> ·
              Rating tattico: <span className="font-mono text-text">{stats.rating}</span>
            </p>
            <div className="flex gap-2">
              <Button onClick={() => window.location.reload()}>Rigioca</Button>
              <Link href="/app/tattiche">
                <Button variant="secondary">Altre modalità</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  if (!puzzle) {
    return (
      <Shell mode={mode} theme={theme}>
        <Card>
          <CardHeader>
            <CardTitle>
              {mode === "review" ? "Ripasso completato" : "Nessun puzzle disponibile"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-text-muted">
              {mode === "review"
                ? "Non hai puzzle in scadenza. Torna più tardi o allenati in modalità adattiva."
                : "Non sono stati trovati puzzle per questi criteri. Importa il dataset o cambia modalità."}
            </p>
            <Link href="/app/tattiche">
              <Button variant="secondary">Torna alle tattiche</Button>
            </Link>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  return (
    <Shell mode={mode} theme={theme}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] 2xl:grid-cols-[auto_18rem] 2xl:justify-center">
        <div>
          <PuzzleSolver key={puzzle.id} puzzle={puzzle} onSolved={handleSolved} />
          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {puzzle.themes.slice(0, 4).map((t) => (
                <Badge key={t} variant="muted">
                  {themeLabel(t)}
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              {justSolved && (
                <Button size="sm" onClick={advanceNow} disabled={loading}>
                  {loading ? "…" : "Prossimo"}
                </Button>
              )}
              {!justSolved && (
                <Button size="sm" variant="ghost" onClick={skip} disabled={loading}>
                  Salta
                </Button>
              )}
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          {isTimed && (
            <Stat label="Tempo" value={formatTime(timeLeft)} highlight={timeLeft <= 15} />
          )}
          <Stat label="Rating tattico" value={stats.rating} />
          <Stat label="Serie attuale" value={stats.currentStreak} />
          <Stat label={isTimed ? "Risolti (sfida)" : "Risolti (sessione)"} value={sessionSolved} />
          <p className="text-xs text-text-muted">
            Difficoltà puzzle:{" "}
            <span className="font-mono text-text">{puzzle.rating}</span>
          </p>
        </aside>
      </div>
    </Shell>
  );
}

/** Intestazione comune: titolo modalità + link di ritorno. */
function Shell({
  mode,
  theme,
  children,
}: {
  mode: TacticMode;
  theme: string | null;
  children: React.ReactNode;
}) {
  const title =
    mode === "theme" && theme ? `${MODE_TITLE.theme} · ${themeLabel(theme)}` : MODE_TITLE[mode];
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold tracking-tight">{title}</h1>
      {children}
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="text-xs uppercase tracking-wide text-text-muted">{label}</div>
      <div
        className="mt-1 font-mono text-2xl"
        style={highlight ? { color: "var(--eval-blunder)" } : undefined}
      >
        {value}
      </div>
    </div>
  );
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}
