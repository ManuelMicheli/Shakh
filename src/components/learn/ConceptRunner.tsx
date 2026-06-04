"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { PuzzleSolver } from "@/components/tactics/PuzzleSolver";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { recordAttempt } from "@/app/app/tattiche/actions";
import type { Puzzle, SolveResult } from "@/lib/tactics/types";

const STORE_KEY = "shakh:learn:concepts";

/** Segna un concetto come completato in localStorage. */
function markDone(slug: string) {
  try {
    const cur = JSON.parse(localStorage.getItem(STORE_KEY) ?? "[]") as string[];
    if (!cur.includes(slug)) localStorage.setItem(STORE_KEY, JSON.stringify([...cur, slug]));
  } catch {
    /* localStorage non disponibile */
  }
}

export interface ConceptRunnerProps {
  slug: string;
  title: string;
  intro: string;
  goal: string;
  puzzles: Puzzle[];
}

type Stage = "intro" | "solve" | "done";

export function ConceptRunner({ slug, title, intro, goal, puzzles }: ConceptRunnerProps) {
  const t = useTranslations("theory");
  const { toast } = useToast();
  const [stage, setStage] = useState<Stage>("intro");
  const [index, setIndex] = useState(0);
  const [solved, setSolved] = useState(0);

  const total = puzzles.length;
  const current = puzzles[index];

  useEffect(() => {
    if (stage === "done") markDone(slug);
  }, [stage, slug]);

  const handleSolved = useCallback(
    async (result: SolveResult) => {
      const puzzle = puzzles[index];
      if (result.clean) setSolved((n) => n + 1);
      const res = await recordAttempt({
        ...result,
        puzzleId: puzzle.id,
        puzzleRating: puzzle.rating,
        themes: puzzle.themes,
        fromReview: false,
      });
      if (!res.ok) {
        toast({ title: t("conceptRunner.saveFailed"), description: res.error, variant: "error" });
      }
      window.setTimeout(() => {
        if (index + 1 >= total) setStage("done");
        else setIndex((i) => i + 1);
      }, 1000);
    },
    [index, puzzles, total, toast, t],
  );

  if (stage === "intro") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="leading-relaxed text-text-muted">{intro}</p>
          <p className="text-sm">
            <span className="font-medium">{t("conceptRunner.goal")}</span> {goal}
          </p>
          {total === 0 ? (
            <p className="text-sm text-text-muted">
              {t("conceptRunner.noExercises")}
            </p>
          ) : (
            <Button onClick={() => setStage("solve")}>
              {t("conceptRunner.start", { count: total })}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  if (stage === "done") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("conceptRunner.completed")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-text-muted">
            {t.rich("conceptRunner.solvedSummary", {
              solved: () => <span className="font-mono text-text">{solved}</span>,
              total,
              title: () => <strong>{title}</strong>,
            })}
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href="/app/impara">
              <Button>{t("conceptRunner.moreConcepts")}</Button>
            </Link>
            <Link href="/app/tattiche?mode=adaptive">
              <Button variant="secondary">{t("conceptRunner.keepTraining")}</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-text-muted">{goal}</span>
        <span className="font-mono text-sm text-text-muted">
          {index + 1} / {total}
        </span>
      </div>
      <div className="mx-auto w-full max-w-xl lg:max-w-2xl xl:max-w-4xl">
        <PuzzleSolver key={current.id} puzzle={current} onSolved={handleSolved} />
      </div>
    </div>
  );
}
