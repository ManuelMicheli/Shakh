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
      setError(out.error ?? "Errore imprevisto.");
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
          <CardTitle>{name ? `Benvenuto, ${name}` : "Benvenuto in Shakh"}</CardTitle>
          <CardDescription>
            Sono il tuo coach. Insieme partiamo dal tuo livello reale e costruiamo
            un percorso su misura, dove ti spiego sempre il <em>perché</em> delle
            mosse. Bastano un paio di minuti per cominciare bene.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="space-y-1 text-sm text-text-muted">
            <li>1 · Due domande veloci su di te</li>
            <li>2 · Collega Lichess o Chess.com (se vuoi)</li>
            <li>3 · Un mini-test per tararti, e si parte</li>
          </ol>
          <Button onClick={() => setPhase("self")}>Iniziamo</Button>
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
            <Button disabled={!canContinue} onClick={() => setPhase("connect")}>
              Continua
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
          <CardTitle>Collega un account online</CardTitle>
          <CardDescription>
            Giochi su Lichess o Chess.com? Collegalo: dopo una rapida verifica
            useremo il tuo rating reale per posizionarti con precisione e
            importeremo le tue ultime partite. È facoltativo — puoi farlo anche
            più tardi dal profilo.
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
              <Badge variant="muted">fatto</Badge>
              Account verificato: ti abbiamo già posizionato dal tuo rating reale.
            </p>
          )}
          <div className="flex justify-between">
            <Button variant="ghost" size="sm" onClick={() => setPhase("test")}>
              {hasVerified ? "Salta il test, vai avanti" : "Salta, lo collego dopo"}
            </Button>
            <Button onClick={() => setPhase(hasVerified ? "tour" : "test")}>
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
      // Test finito (o nessun puzzle disponibile): vai al tour.
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
            <Button onClick={() => setPhase("tour")}>Avanti</Button>
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
          {hasVerified && (
            <p className="rounded-md border border-border bg-surface-2 px-3 py-2 text-xs text-text-muted">
              Hai già un account verificato: il test non è necessario, ma se lo
              fai affiniamo ancora la stima.
            </p>
          )}
          <PuzzleSolver
            key={current.id}
            puzzle={current}
            onSolved={(res) => onSolved(current, res)}
          />
          <div className="flex justify-between">
            <Button variant="ghost" size="sm" onClick={() => advanceTest(current.rating, false)}>
              Salta questo
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setPhase("tour")}>
              Salta il test
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
              Indietro
            </Button>
            {last ? (
              <Button onClick={() => setPhase("done")}>Avanti</Button>
            ) : (
              <Button onClick={() => setTourIdx((i) => i + 1)}>Avanti</Button>
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
          <CardTitle>{name ? `Tutto pronto, ${name}` : "Tutto pronto"}</CardTitle>
          <CardDescription>
            Ti ho posizionato nel percorso e la dashboard è pronta. Da qui in poi
            ti seguo passo dopo passo. In bocca al lupo e buon gioco!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <p className="text-sm text-eval-blunder">{error}</p>}
          <Button onClick={finish}>Vai alla dashboard</Button>
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
