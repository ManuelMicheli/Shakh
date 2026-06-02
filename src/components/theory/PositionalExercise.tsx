"use client";

import { useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Chess, type Square, type PieceSymbol } from "chess.js";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { engine } from "@/lib/engine/engine";
import { toWhiteRelative, formatEval } from "@/lib/engine/score";
import { uciPvToSan, uciMoveToSan } from "@/lib/chess/uciPv";
import { recordMiddlegameAttempt } from "@/app/app/teoria/actions";
import type { LegalDests } from "@/lib/chess/useChessGame";
import type { EngineLineFact, PositionFacts } from "@/lib/ai/types";
import type { PositionalExercise as Exercise } from "@/lib/theory/middlegame";

const ChessBoard = dynamic(
  () => import("@/components/chess/ChessBoard").then((m) => m.ChessBoard),
  { ssr: false },
);

const LINES_DEPTH = 16;
const MOVE_DEPTH = 14;
/** Soglia di "ragionevolezza": una perdita ≤ 0.6 pedoni rispetto alla migliore è ok. */
const REASONABLE_CP = 60;

function buildDests(fen: string): LegalDests {
  const dests: LegalDests = new Map();
  const chess = new Chess(fen);
  for (const m of chess.moves({ verbose: true })) {
    const list = dests.get(m.from);
    if (list) list.push(m.to);
    else dests.set(m.from, [m.to]);
  }
  return dests;
}

function whiteEvalText(score: number, type: "cp" | "mate", turn: "w" | "b"): string {
  return formatEval(toWhiteRelative(score, type, turn), type).replace("-", "−");
}

/** Centipawn dal punto di vista del lato che muove (mate = ±100000). */
function moverCp(score: number, type: "cp" | "mate"): number {
  if (type === "mate") return score > 0 ? 100000 - score : -100000 - score;
  return score;
}

interface Verdict {
  san: string;
  evalText: string;
  reasonable: boolean;
}

export interface PositionalExerciseProps {
  exercise: Exercise;
}

/**
 * Esercizio "trova il piano / la mossa" (prompt 06c §2). NON c'è un'unica
 * soluzione: l'utente propone una mossa, il MOTORE (02) la valuta, il COACH (04,
 * Funzione B) commenta in italiano se è coerente col piano. Il principio resta
 * "il motore dà i numeri, il modello dà le parole": il modello non inventa
 * valutazioni.
 */
export function PositionalExercise({ exercise }: PositionalExerciseProps) {
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [showPlan, setShowPlan] = useState(false);

  const fen = exercise.fen;
  const turn: "w" | "b" = fen.split(" ")[1] === "b" ? "b" : "w";
  const dests = useMemo<LegalDests>(() => (busy ? new Map() : buildDests(fen)), [busy, fen]);

  const evaluate = useCallback(
    async (from: Square, to: Square, promotion?: PieceSymbol) => {
      if (busy) return;
      // Mossa proposta dall'utente (chess.js: autorità sulla legalità).
      const chess = new Chess(fen);
      let played;
      try {
        played = chess.move({ from, to, promotion });
      } catch {
        return;
      }
      const afterFen = chess.fen();

      setBusy(true);
      setVerdict(null);
      setAnswer("");
      setShowPlan(false);
      try {
        await engine.init();
        setPhase("Il motore analizza la posizione…");
        const before = await engine.analyze(fen, { depth: LINES_DEPTH, multiPV: 3 }).result;
        const lines: EngineLineFact[] = before.lines.slice(0, 3).map((l) => ({
          evalText: whiteEvalText(l.score, l.scoreType, turn),
          pvSan: uciPvToSan(fen, l.pv),
        }));
        const bestTop = before.lines[0];
        const bestCp = bestTop ? moverCp(bestTop.score, bestTop.scoreType) : 0;

        setPhase(`Valuto ${played.san}…`);
        const after = await engine.analyze(afterFen, { depth: MOVE_DEPTH }).result;
        const afterTop = after.lines[0];
        const afterTurn = (afterFen.split(" ")[1] as "w" | "b") ?? "w";
        // L'eval dopo è dal lato AVVERSARIO: negala per riportarla al lato dell'utente.
        const playedCp = afterTop ? -moverCp(afterTop.score, afterTop.scoreType) : 0;

        const isBest = uciMoveToSan(fen, before.bestMove) === played.san;
        const loss = bestCp - playedCp;
        const reasonable = isBest || loss <= REASONABLE_CP;

        const evalText = afterTop
          ? whiteEvalText(afterTop.score, afterTop.scoreType, afterTurn)
          : "—";
        setVerdict({ san: played.san, evalText, reasonable });
        void recordMiddlegameAttempt(exercise.progressKey, reasonable);

        // Coach (Funzione B): spiega in italiano se la mossa è coerente col piano.
        const facts: PositionFacts = {
          fen,
          turn,
          lines,
          askedMove: { san: played.san, evalText, isBest },
        };
        setPhase("Il coach commenta…");
        const res = await fetch("/api/coach/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fen: facts.fen,
            turn: facts.turn,
            question: `Sto cercando un piano per il ${
              exercise.userColor === "white" ? "Bianco" : "Nero"
            }. La mossa ${played.san} è coerente con il piano corretto in questa posizione? Spiega brevemente perché sì o perché no.`,
            lines: facts.lines,
            askedMove: facts.askedMove,
          }),
        });
        if (!res.ok || !res.body) {
          const msg = await res.text().catch(() => "");
          setAnswer(
            msg.includes("non configurato")
              ? null
              : "Il coach non è disponibile ora; affidati alla valutazione del motore.",
          );
          return;
        }
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        let acc = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += dec.decode(value, { stream: true });
          setAnswer(acc);
        }
      } catch {
        setAnswer("Non sono riuscito a valutare la mossa. Riprova.");
      } finally {
        setBusy(false);
        setPhase(null);
      }
    },
    [busy, fen, turn, exercise.userColor, exercise.progressKey],
  );

  const reset = useCallback(() => {
    setVerdict(null);
    setAnswer(null);
    setPhase(null);
    setShowPlan(false);
  }, []);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>Esercizio: trova il piano</CardTitle>
          <span className="text-xs text-text-muted">
            Muove il {exercise.userColor === "white" ? "Bianco" : "Nero"}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-sm leading-relaxed">{exercise.prompt}</p>

        <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="mx-auto w-full max-w-md">
            <ChessBoard
              fen={fen}
              orientation={exercise.userColor}
              mode="play"
              movableColor={exercise.userColor}
              dests={dests}
              onMove={evaluate}
            />
          </div>

          <div className="space-y-3">
            {busy && phase && (
              <p className="flex items-center gap-2 text-sm text-text-muted">
                <Spinner /> {phase}
              </p>
            )}

            {verdict && (
              <div className="rounded-md border border-border bg-surface p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-sm font-medium">{verdict.san}</span>
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-xs font-medium",
                      verdict.reasonable ? "bg-text text-bg" : "border border-border text-text-muted",
                    )}
                  >
                    {verdict.reasonable ? "Piano ragionevole" : "Poco coerente"}
                  </span>
                </div>
                <p className="mt-1 font-mono text-xs text-text-muted">
                  Valutazione dopo la mossa: {verdict.evalText}
                </p>
              </div>
            )}

            {answer && <p className="text-sm leading-relaxed">{answer}</p>}

            {!verdict && !busy && (
              <p className="text-sm text-text-muted">
                Proponi una mossa sulla scacchiera: il motore la valuta e il coach
                spiega se è in linea col piano.
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              {verdict && (
                <Button size="sm" variant="secondary" onClick={reset}>
                  Prova un&apos;altra mossa
                </Button>
              )}
              {exercise.planHint && verdict && (
                <Button size="sm" variant="ghost" onClick={() => setShowPlan((v) => !v)}>
                  {showPlan ? "Nascondi il piano" : "Mostra il piano"}
                </Button>
              )}
            </div>

            {showPlan && exercise.planHint && (
              <p className="rounded-md border border-border bg-surface-2 p-2 text-sm leading-relaxed text-text-muted">
                {exercise.planHint}
              </p>
            )}

            {exercise.relatedTacticsTheme && (
              <p className="text-xs text-text-muted">
                Tema collegato:{" "}
                <Link
                  href={`/app/tattiche?mode=theme&theme=${exercise.relatedTacticsTheme}`}
                  className="underline underline-offset-2 hover:text-text"
                >
                  allena le tattiche a tema →
                </Link>
              </p>
            )}

            <p className="text-[11px] leading-relaxed text-text-muted">
              Non c&apos;è un&apos;unica soluzione: si valuta la ragionevolezza del
              piano. Il motore dà i numeri, il coach le parole.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
