"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  completeOnboarding,
  getDiagnosticPuzzles,
} from "@/app/app/onboarding/actions";
import { ExternalAccounts } from "@/components/profile/ExternalAccounts";
import type { LinkedAccount } from "@/app/app/profilo/actions";
import { baselineFromSelf, levelFromRating } from "@/lib/path/diagnostic";
import type { MiniTestResult, SelfAssessment } from "@/lib/path/diagnostic";
import type { Puzzle, SolveResult } from "@/lib/tactics/types";

const PuzzleSolver = dynamic(
  () => import("@/components/tactics/PuzzleSolver").then((m) => m.PuzzleSolver),
  { ssr: false },
);

type Phase = "intro" | "self" | "connect" | "test" | "tour" | "done" | "saving";
type Experience = SelfAssessment["experience"];

/** Bottone-opzione monocromo (selezione per inversione). */
function Choice({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-md border px-4 py-2.5 text-left text-sm transition-colors",
        active
          ? "border-text bg-text text-bg"
          : "border-border bg-surface text-text hover:bg-surface-2",
      )}
    >
      {children}
    </button>
  );
}

/** Chiavi i18n dei tre passi del tour (titolo/corpo risolti a render). */
const TOUR = [
  { title: "tour.path.title", body: "tour.path.body" },
  { title: "tour.coach.title", body: "tour.coach.body" },
  { title: "tour.free.title", body: "tour.free.body" },
] as const;

export interface OnboardingFlowProps {
  /** Nome con cui salutare (display name o username), se disponibile. */
  name?: string | null;
  /** Account online già collegati al rientro nel flusso. */
  initialAccounts?: LinkedAccount[];
}

export function OnboardingFlow({ name, initialAccounts = [] }: OnboardingFlowProps) {
  const t = useTranslations("common");
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("intro");

  // Autovalutazione
  const [knowsRules, setKnowsRules] = useState<boolean | null>(null);
  const [playsOnline, setPlaysOnline] = useState<boolean | null>(null);
  const [onlineRating, setOnlineRating] = useState("");
  const [experience, setExperience] = useState<Experience | null>(null);

  // Account online: ci interessa sapere se almeno uno è verificato (rating reale
  // più affidabile del mini-test → ne proponiamo il salto).
  const [hasVerified, setHasVerified] = useState(
    initialAccounts.some((a) => a.verified),
  );
  const onAccountsChange = useCallback((accs: LinkedAccount[]) => {
    setHasVerified(accs.some((a) => a.verified));
  }, []);

  // Mini-test
  const [puzzles, setPuzzles] = useState<Puzzle[] | null>(null);
  const [testIdx, setTestIdx] = useState(0);
  const [results, setResults] = useState<MiniTestResult[]>([]);

  // Tour
  const [tourIdx, setTourIdx] = useState(0);

  const [error, setError] = useState<string | null>(null);

  const self: SelfAssessment = useMemo(
    () => ({
      knowsRules: knowsRules ?? false,
      onlineRating: playsOnline && onlineRating ? Number(onlineRating) : null,
      experience: experience ?? "new",
    }),
    [knowsRules, playsOnline, onlineRating, experience],
  );

  // Carica i puzzle del mini-test entrando nella fase test.
  useEffect(() => {
    if (phase !== "test" || puzzles !== null) return;
    let alive = true;
    void getDiagnosticPuzzles().then((p) => {
      if (alive) setPuzzles(p);
    });
    return () => {
      alive = false;
    };
  }, [phase, puzzles]);

  const advanceTest = useCallback((rating: number, solved: boolean) => {
    setResults((r) => [...r, { rating, solved }]);
    setTestIdx((i) => i + 1);
  }, []);

  const onSolved = useCallback(
    (puzzle: Puzzle, res: SolveResult) => {
      // "Risolto" = pulito e senza aiuto: segnale affidabile per la stima.
      advanceTest(puzzle.rating, res.clean && !res.hinted);
    },
    [advanceTest],
  );

  const finish = useCallback(async () => {
    setPhase("saving");
    setError(null);
    const out = await completeOnboarding({ self, results });
    if (!out.ok) {
      setError(out.error ?? t("error.unexpected"));
      setPhase("done");
      return;
    }
    router.push("/app");
    router.refresh();
  }, [self, results, router, t]);

  // Anteprima della stima (solo indicativa, lato client).
  const previewRating = (() => {
    const baseline = baselineFromSelf(self);
    if (results.length === 0) return baseline;
    const perf =
      results.reduce((s, r) => s + (r.solved ? r.rating : r.rating - 300), 0) /
      results.length;
    return Math.round((baseline + perf) / 2);
  })();

  // ---------- Render per fase ----------

  if (phase === "intro") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{name ? t("intro.titleNamed", { name }) : t("intro.title")}</CardTitle>
          <CardDescription>
            {t.rich("intro.desc", { em: (chunks) => <em>{chunks}</em> })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="space-y-1 text-sm text-text-muted">
            <li>{t("intro.step1")}</li>
            <li>{t("intro.step2")}</li>
            <li>{t("intro.step3")}</li>
          </ol>
          <Button onClick={() => setPhase("self")}>{t("intro.start")}</Button>
        </CardContent>
      </Card>
    );
  }

  if (phase === "self") {
    const ratingValid = !playsOnline || (onlineRating !== "" && Number(onlineRating) > 0);
    const canContinue =
      knowsRules !== null && playsOnline !== null && experience !== null && ratingValid;
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("self.title")}</CardTitle>
          <CardDescription>{t("self.desc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-medium">{t("self.rulesQ")}</legend>
            <div className="grid grid-cols-2 gap-2">
              <Choice active={knowsRules === true} onClick={() => setKnowsRules(true)}>
                {t("self.yes")}
              </Choice>
              <Choice active={knowsRules === false} onClick={() => setKnowsRules(false)}>
                {t("self.notEntirely")}
              </Choice>
            </div>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-medium">{t("self.onlineQ")}</legend>
            <div className="grid grid-cols-2 gap-2">
              <Choice active={playsOnline === true} onClick={() => setPlaysOnline(true)}>
                {t("self.yes")}
              </Choice>
              <Choice active={playsOnline === false} onClick={() => setPlaysOnline(false)}>
                {t("self.no")}
              </Choice>
            </div>
            {playsOnline && (
              <Input
                type="number"
                inputMode="numeric"
                placeholder={t("self.ratingPlaceholder")}
                value={onlineRating}
                onChange={(e) => setOnlineRating(e.target.value)}
                className="mt-2"
              />
            )}
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-medium">{t("self.experienceQ")}</legend>
            <div className="space-y-2">
              <Choice active={experience === "new"} onClick={() => setExperience("new")}>
                {t("self.expNew")}
              </Choice>
              <Choice active={experience === "some"} onClick={() => setExperience("some")}>
                {t("self.expSome")}
              </Choice>
              <Choice
                active={experience === "experienced"}
                onClick={() => setExperience("experienced")}
              >
                {t("self.expExperienced")}
              </Choice>
            </div>
          </fieldset>

          <div className="flex justify-end">
            <Button disabled={!canContinue} onClick={() => setPhase("connect")}>
              {t("continue")}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (phase === "connect") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("connect.title")}</CardTitle>
          <CardDescription>{t("connect.desc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <ExternalAccounts
            bare
            initial={initialAccounts}
            onAccountsChange={onAccountsChange}
          />
          {hasVerified && (
            <p className="flex items-center gap-2 text-sm text-text-muted">
              <Badge variant="muted">{t("connect.doneBadge")}</Badge>
              {t("connect.verified")}
            </p>
          )}
          <div className="flex justify-between">
            <Button variant="ghost" size="sm" onClick={() => setPhase("test")}>
              {hasVerified ? t("connect.skipTestMoveOn") : t("connect.skipLinkLater")}
            </Button>
            <Button onClick={() => setPhase(hasVerified ? "tour" : "test")}>
              {t("continue")}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (phase === "test") {
    if (puzzles === null) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>{t("test.title")}</CardTitle>
            <CardDescription>{t("test.preparing")}</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center py-8">
            <Spinner />
          </CardContent>
        </Card>
      );
    }

    const current = puzzles[testIdx];
    if (!current) {
      // Test finito (o nessun puzzle disponibile): vai al tour.
      return (
        <Card>
          <CardHeader>
            <CardTitle>{t("test.complete")}</CardTitle>
            <CardDescription>
              {t("test.estimate", {
                rating: String(previewRating),
                level: String(levelFromRating(previewRating)),
              })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setPhase("tour")}>{t("next")}</Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t("test.title")}</CardTitle>
            <span className="font-mono text-xs text-text-muted">
              {testIdx + 1}/{puzzles.length}
            </span>
          </div>
          <CardDescription>{t("test.findBest")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasVerified && (
            <p className="rounded-md border border-border bg-surface-2 px-3 py-2 text-xs text-text-muted">
              {t("test.verifiedNote")}
            </p>
          )}
          <PuzzleSolver
            key={current.id}
            puzzle={current}
            onSolved={(res) => onSolved(current, res)}
          />
          <div className="flex justify-between">
            <Button variant="ghost" size="sm" onClick={() => advanceTest(current.rating, false)}>
              {t("test.skipThis")}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setPhase("tour")}>
              {t("test.skipTest")}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (phase === "tour") {
    const step = TOUR[tourIdx];
    const last = tourIdx === TOUR.length - 1;
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t(step.title)}</CardTitle>
            <span className="font-mono text-xs text-text-muted">
              {tourIdx + 1}/{TOUR.length}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-relaxed text-text-muted">{t(step.body)}</p>
          <div className="flex justify-between">
            <Button
              variant="ghost"
              size="sm"
              disabled={tourIdx === 0}
              onClick={() => setTourIdx((i) => Math.max(0, i - 1))}
            >
              {t("back")}
            </Button>
            {last ? (
              <Button onClick={() => setPhase("done")}>{t("next")}</Button>
            ) : (
              <Button onClick={() => setTourIdx((i) => i + 1)}>{t("next")}</Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (phase === "done") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{name ? t("done.titleNamed", { name }) : t("done.title")}</CardTitle>
          <CardDescription>{t("done.desc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <p className="text-sm text-eval-blunder">{error}</p>}
          <Button onClick={finish}>{t("done.goToDashboard")}</Button>
        </CardContent>
      </Card>
    );
  }

  // saving
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-10">
        <Spinner />
        <p className="text-sm text-text-muted">{t("saving.preparing")}</p>
      </CardContent>
    </Card>
  );
}
