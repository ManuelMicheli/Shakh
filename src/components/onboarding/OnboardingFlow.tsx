"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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

const TOUR = [
  {
    title: "Your path",
    body: "A leveled map takes you from beginner to club player. Nodes unlock once you prove you've mastered the previous ones.",
  },
  {
    title: "The coach explains the why",
    body: "No memorizing moves: the coach explains the meaning behind your choices, anchored to engine data and statistics.",
  },
  {
    title: "Guided first, then free",
    body: "At the start we tell you the next step. As you grow, the path stays as a reference and you train wherever you like.",
  },
];

export interface OnboardingFlowProps {
  /** Nome con cui salutare (display name o username), se disponibile. */
  name?: string | null;
  /** Account online già collegati al rientro nel flusso. */
  initialAccounts?: LinkedAccount[];
}

export function OnboardingFlow({ name, initialAccounts = [] }: OnboardingFlowProps) {
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
      setError(out.error ?? "Unexpected error.");
      setPhase("done");
      return;
    }
    router.push("/app");
    router.refresh();
  }, [self, results, router]);

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
          <CardTitle>{name ? `Welcome, ${name}` : "Welcome to Shakh"}</CardTitle>
          <CardDescription>
            I&apos;m your coach. Together we&apos;ll start from your real level and build a
            tailored path, where I always explain the <em>why</em> behind the
            moves. It only takes a couple of minutes to get off to a good start.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="space-y-1 text-sm text-text-muted">
            <li>1 · A couple of quick questions about you</li>
            <li>2 · Link Lichess or Chess.com (if you want)</li>
            <li>3 · A mini-test to calibrate, and you&apos;re off</li>
          </ol>
          <Button onClick={() => setPhase("self")}>Let&apos;s start</Button>
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
          <CardTitle>A few questions</CardTitle>
          <CardDescription>Go with your gut: it just helps us start from the right point.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-medium">Do you know how the pieces move?</legend>
            <div className="grid grid-cols-2 gap-2">
              <Choice active={knowsRules === true} onClick={() => setKnowsRules(true)}>
                Yes
              </Choice>
              <Choice active={knowsRules === false} onClick={() => setKnowsRules(false)}>
                Not entirely
              </Choice>
            </div>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-medium">Do you play online?</legend>
            <div className="grid grid-cols-2 gap-2">
              <Choice active={playsOnline === true} onClick={() => setPlaysOnline(true)}>
                Yes
              </Choice>
              <Choice active={playsOnline === false} onClick={() => setPlaysOnline(false)}>
                No
              </Choice>
            </div>
            {playsOnline && (
              <Input
                type="number"
                inputMode="numeric"
                placeholder="Approximate rating (e.g. 1200)"
                value={onlineRating}
                onChange={(e) => setOnlineRating(e.target.value)}
                className="mt-2"
              />
            )}
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-medium">How long have you been playing?</legend>
            <div className="space-y-2">
              <Choice active={experience === "new"} onClick={() => setExperience("new")}>
                Not long (less than six months)
              </Choice>
              <Choice active={experience === "some"} onClick={() => setExperience("some")}>
                A few years, without training seriously
              </Choice>
              <Choice
                active={experience === "experienced"}
                onClick={() => setExperience("experienced")}
              >
                I&apos;ve played for a while and I train
              </Choice>
            </div>
          </fieldset>

          <div className="flex justify-end">
            <Button disabled={!canContinue} onClick={() => setPhase("connect")}>
              Continue
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
          <CardTitle>Link an online account</CardTitle>
          <CardDescription>
            Do you play on Lichess or Chess.com? Link it: after a quick
            verification we&apos;ll use your real rating to place you precisely and
            import your latest games. It&apos;s optional — you can also do it later
            from your profile.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <ExternalAccounts
            bare
            initial={initialAccounts}
            onAccountsChange={onAccountsChange}
          />
          {hasVerified && (
            <p className="flex items-center gap-2 text-sm text-text-muted">
              <Badge variant="muted">done</Badge>
              Account verified: we&apos;ve already placed you from your real rating.
            </p>
          )}
          <div className="flex justify-between">
            <Button variant="ghost" size="sm" onClick={() => setPhase("test")}>
              {hasVerified ? "Skip the test, move on" : "Skip, I'll link it later"}
            </Button>
            <Button onClick={() => setPhase(hasVerified ? "tour" : "test")}>
              Continue
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
            <CardTitle>Tactical mini-test</CardTitle>
            <CardDescription>Preparing a few positions…</CardDescription>
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
            <CardTitle>Test complete</CardTitle>
            <CardDescription>
              Provisional estimate: tactical rating ~{previewRating}, starting
              level {levelFromRating(previewRating)}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setPhase("tour")}>Next</Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Tactical mini-test</CardTitle>
            <span className="font-mono text-xs text-text-muted">
              {testIdx + 1}/{puzzles.length}
            </span>
          </div>
          <CardDescription>
            Find the best move. If you don&apos;t see it, you can skip.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasVerified && (
            <p className="rounded-md border border-border bg-surface-2 px-3 py-2 text-xs text-text-muted">
              You already have a verified account: the test isn&apos;t required, but
              taking it refines the estimate further.
            </p>
          )}
          <PuzzleSolver
            key={current.id}
            puzzle={current}
            onSolved={(res) => onSolved(current, res)}
          />
          <div className="flex justify-between">
            <Button variant="ghost" size="sm" onClick={() => advanceTest(current.rating, false)}>
              Skip this one
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setPhase("tour")}>
              Skip the test
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (phase === "tour") {
    const t = TOUR[tourIdx];
    const last = tourIdx === TOUR.length - 1;
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t.title}</CardTitle>
            <span className="font-mono text-xs text-text-muted">
              {tourIdx + 1}/{TOUR.length}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-relaxed text-text-muted">{t.body}</p>
          <div className="flex justify-between">
            <Button
              variant="ghost"
              size="sm"
              disabled={tourIdx === 0}
              onClick={() => setTourIdx((i) => Math.max(0, i - 1))}
            >
              Back
            </Button>
            {last ? (
              <Button onClick={() => setPhase("done")}>Next</Button>
            ) : (
              <Button onClick={() => setTourIdx((i) => i + 1)}>Next</Button>
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
          <CardTitle>{name ? `All set, ${name}` : "All set"}</CardTitle>
          <CardDescription>
            I&apos;ve placed you on the path and your dashboard is ready. From here on
            I&apos;ll guide you step by step. Good luck and enjoy the game!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <p className="text-sm text-eval-blunder">{error}</p>}
          <Button onClick={finish}>Go to dashboard</Button>
        </CardContent>
      </Card>
    );
  }

  // saving
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-10">
        <Spinner />
        <p className="text-sm text-text-muted">Preparing your path…</p>
      </CardContent>
    </Card>
  );
}
