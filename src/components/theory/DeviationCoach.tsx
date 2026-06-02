"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { engine } from "@/lib/engine/engine";
import { toWhiteRelative, formatEval } from "@/lib/engine/score";
import { uciPvToSan, uciMoveToSan, tryPlaySan } from "@/lib/chess/uciPv";
import type { EngineLineFact, PositionFacts } from "@/lib/ai/types";

const LINES_DEPTH = 16;
const MOVE_DEPTH = 14;

function whiteEvalText(score: number, type: "cp" | "mate", turn: "w" | "b"): string {
  return formatEval(toWhiteRelative(score, type, turn), type).replace("-", "−");
}

export interface DeviationCoachProps {
  /** Posizione PRIMA della deviazione (dove si è lasciata la linea). */
  fenBefore: string;
  /** Mossa di deviazione giocata, in SAN. */
  deviationSan: string;
  coachConfigured: boolean;
}

/**
 * "Perché non questa mossa?" — quando l'utente devia dalla linea, il MOTORE
 * valuta la mossa proposta e il COACH la spiega in italiano. Riuso diretto del
 * flusso della Funzione B (prompt 04): nessuna nuova logica AI, il motore dà i
 * numeri, il modello dà le parole.
 */
export function DeviationCoach({ fenBefore, deviationSan, coachConfigured }: DeviationCoachProps) {
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<string | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);

  const turn: "w" | "b" = fenBefore.split(" ")[1] === "b" ? "b" : "w";

  const ask = async () => {
    if (busy) return;
    setBusy(true);
    setAnswer("");
    try {
      await engine.init();
      setPhase("Interrogo il motore…");
      const evaluation = await engine.analyze(fenBefore, { depth: LINES_DEPTH, multiPV: 3 }).result;
      const lines: EngineLineFact[] = evaluation.lines.slice(0, 3).map((l) => ({
        evalText: whiteEvalText(l.score, l.scoreType, turn),
        pvSan: uciPvToSan(fenBefore, l.pv),
      }));

      const facts: PositionFacts = { fen: fenBefore, turn, lines };

      // Valuta la mossa di deviazione concreta.
      const played = tryPlaySan(fenBefore, deviationSan);
      if (played) {
        setPhase(`Valuto ${played.san}…`);
        const afterTurn = (played.fen.split(" ")[1] as "w" | "b") ?? "w";
        const afterEval = await engine.analyze(played.fen, { depth: MOVE_DEPTH }).result;
        const top = afterEval.lines[0];
        if (top) {
          facts.askedMove = {
            san: played.san,
            evalText: whiteEvalText(top.score, top.scoreType, afterTurn),
            isBest: uciMoveToSan(fenBefore, evaluation.bestMove) === played.san,
          };
        }
      }

      setPhase("Il coach sta rispondendo…");
      const res = await fetch("/api/coach/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fen: facts.fen,
          turn: facts.turn,
          question: `Perché non ${deviationSan}?`,
          lines: facts.lines,
          askedMove: facts.askedMove,
        }),
      });
      if (!res.ok || !res.body) {
        const msg = await res.text().catch(() => "Errore del coach.");
        setAnswer(`Spiacente: ${msg}`);
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
      setAnswer("Non sono riuscito a rispondere. Riprova.");
    } finally {
      setBusy(false);
      setPhase(null);
    }
  };

  if (!coachConfigured) {
    return (
      <p className="text-xs text-text-muted">
        Coach non configurato: puoi comunque valutare la deviazione con il motore.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <Button variant="secondary" size="sm" onClick={() => void ask()} disabled={busy}>
        Perché non <span className="ml-1 font-mono">{deviationSan}</span>?
      </Button>
      {busy && phase && (
        <p className="flex items-center gap-2 text-xs text-text-muted">
          <Spinner /> {phase}
        </p>
      )}
      {answer && <p className="text-sm leading-relaxed">{answer}</p>}
    </div>
  );
}
