"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import {
  completeOnboarding,
  getDiagnosticPuzzles,
} from "@/app/app/onboarding/actions";
import { baselineFromSelf, levelFromRating } from "@/lib/path/diagnostic";
import type { MiniTestResult, SelfAssessment } from "@/lib/path/diagnostic";
import type { Puzzle, SolveResult } from "@/lib/tactics/types";

const PuzzleSolver = dynamic(
  () => import("@/components/tactics/PuzzleSolver").then((m) => m.PuzzleSolver),
  { ssr: false },
);

type Phase = "intro" | "self" | "test" | "extra" | "tour" | "saving";
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
    title: "Il tuo percorso",
    body: "Una mappa a livelli ti porta da principiante a giocatore di club. I nodi si sbloccano quando dimostri di padroneggiare i precedenti.",
  },
  {
    title: "Il coach spiega il perché",
    body: "Niente mosse a memoria: il coach in italiano spiega il senso delle scelte, ancorato ai dati del motore e alle statistiche.",
  },
  {
    title: "Prima guidato, poi libero",
    body: "All'inizio ti diciamo il prossimo passo. Crescendo, il percorso resta come riferimento e tu alleni dove vuoi.",
  },
];

export function OnboardingFlow() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("intro");

  // Autovalutazione
  const [knowsRules, setKnowsRules] = useState<boolean | null>(null);
  const [playsOnline, setPlaysOnline] = useState<boolean | null>(null);
  const [onlineRating, setOnlineRating] = useState("");
  const [experience, setExperience] = useState<Experience | null>(null);

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

  const advanceTest = useCallback(
    (rating: number, solved: boolean) => {
      setResults((r) => [...r, { rating, solved }]);
      setTestIdx((i) => i + 1);
    },
    [],
  );

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
      setError(out.error ?? "Errore imprevisto.");
      setPhase("tour");
      return;
    }
    router.push("/app/percorso");
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
          <CardTitle>Benvenuto in Shakh</CardTitle>
          <CardDescription>
            Un diagnostico breve per stimare il tuo livello e posizionarti nel
            percorso. Tre minuti, niente di più.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setPhase("self")}>Inizia</Button>
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
          <CardTitle>Qualche domanda</CardTitle>
          <CardDescription>Rispondi a istinto: serve solo a partire dal punto giusto.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-medium">Sai come muovono i pezzi?</legend>
            <div className="grid grid-cols-2 gap-2">
              <Choice active={knowsRules === true} onClick={() => setKnowsRules(true)}>
                Sì
              </Choice>
              <Choice active={knowsRules === false} onClick={() => setKnowsRules(false)}>
                Non del tutto
              </Choice>
            </div>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-medium">Giochi online?</legend>
            <div className="grid grid-cols-2 gap-2">
              <Choice active={playsOnline === true} onClick={() => setPlaysOnline(true)}>
                Sì
              </Choice>
              <Choice active={playsOnline === false} onClick={() => setPlaysOnline(false)}>
                No
              </Choice>
            </div>
            {playsOnline && (
              <Input
                type="number"
                inputMode="numeric"
                placeholder="Rating circa (es. 1200)"
                value={onlineRating}
                onChange={(e) => setOnlineRating(e.target.value)}
                className="mt-2"
              />
            )}
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-medium">Da quanto giochi?</legend>
            <div className="space-y-2">
              <Choice active={experience === "new"} onClick={() => setExperience("new")}>
                Da poco (meno di sei mesi)
              </Choice>
              <Choice active={experience === "some"} onClick={() => setExperience("some")}>
                Qualche anno, senza allenarmi sul serio
              </Choice>
              <Choice
                active={experience === "experienced"}
                onClick={() => setExperience("experienced")}
              >
                Gioco da tempo e mi alleno
              </Choice>
            </div>
          </fieldset>

          <div className="flex justify-end">
            <Button disabled={!canContinue} onClick={() => setPhase("test")}>
              Continua
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
            <CardTitle>Mini-test tattico</CardTitle>
            <CardDescription>Sto preparando qualche posizione…</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center py-8">
            <Spinner />
          </CardContent>
        </Card>
      );
    }

    const current = puzzles[testIdx];
    if (!current) {
      // Test finito (o nessun puzzle disponibile): vai all'import opzionale.
      return (
        <Card>
          <CardHeader>
            <CardTitle>Test completato</CardTitle>
            <CardDescription>
              Stima provvisoria: rating tattico ~{previewRating}, livello di
              partenza {levelFromRating(previewRating)}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setPhase("extra")}>Avanti</Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Mini-test tattico</CardTitle>
            <span className="font-mono text-xs text-text-muted">
              {testIdx + 1}/{puzzles.length}
            </span>
          </div>
          <CardDescription>
            Trova la mossa migliore. Se non la vedi, puoi saltare.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <PuzzleSolver
            key={current.id}
            puzzle={current}
            onSolved={(res) => onSolved(current, res)}
          />
          <div className="flex justify-between">
            <Button variant="ghost" size="sm" onClick={() => advanceTest(current.rating, false)}>
              Salta questo
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setPhase("extra")}>
              Salta il test
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (phase === "extra") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Hai una partita da analizzare?</CardTitle>
          <CardDescription>
            Opzionale: importare una tua partita dà un segnale più preciso sul
            tuo livello reale. Puoi farlo anche più tardi.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setPhase("tour")}>
            Più tardi
          </Button>
          <Button onClick={() => setPhase("tour")}>Capito, vai avanti</Button>
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
          {error && <p className="text-sm text-eval-blunder">{error}</p>}
          <div className="flex justify-between">
            <Button
              variant="ghost"
              size="sm"
              disabled={tourIdx === 0}
              onClick={() => setTourIdx((i) => Math.max(0, i - 1))}
            >
              Indietro
            </Button>
            {last ? (
              <Button onClick={finish}>Vai al percorso</Button>
            ) : (
              <Button onClick={() => setTourIdx((i) => i + 1)}>Avanti</Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // saving
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-10">
        <Spinner />
        <p className="text-sm text-text-muted">Preparo il tuo percorso…</p>
      </CardContent>
    </Card>
  );
}
