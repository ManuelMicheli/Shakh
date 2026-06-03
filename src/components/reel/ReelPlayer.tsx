"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { Square } from "chess.js";
import type { DrawShape } from "chessground/draw";
import { Button } from "@/components/ui/button";
import type { ReelData } from "@/lib/reel/payload";

const ChessBoard = dynamic(
  () => import("@/components/chess/ChessBoard").then((m) => m.ChessBoard),
  { ssr: false },
);

const STEP_MS = 1100;

const LABEL_TEXT: Record<string, string> = {
  brilliant: "Mossa brillante",
  best: "Mossa migliore",
  good: "Bella mossa",
};

function labelColor(label: string): string {
  if (label === "brilliant") return "var(--eval-brilliant)";
  if (label === "best") return "var(--eval-best)";
  return "var(--eval-good)";
}

export function ReelPlayer({ data }: { data: ReelData }) {
  const [step, setStep] = useState(0);
  const last = data.fens.length - 1;
  const atEnd = step >= last;

  useEffect(() => {
    if (atEnd) return;
    const id = window.setTimeout(() => setStep((s) => s + 1), STEP_MS);
    return () => window.clearTimeout(id);
  }, [step, atEnd]);

  // Evidenzia la mossa chiave solo all'ultimo fotogramma.
  const shapes: DrawShape[] = atEnd
    ? [{ orig: data.from as Square, dest: data.to as Square, brush: "green" }]
    : [];
  const lastMove: [Square, Square] | null = atEnd
    ? [data.from as Square, data.to as Square]
    : null;

  return (
    <div className="mx-auto w-full max-w-md space-y-3">
      {data.title && <p className="text-center text-sm text-text-muted">{data.title}</p>}

      <div className="relative">
        <ChessBoard
          fen={data.fens[step]}
          orientation={data.orientation}
          mode="view"
          coordinates={false}
          lastMove={lastMove}
          shapes={shapes}
        />
        {atEnd && (
          <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2">
            <span
              className="rounded-full px-3 py-1 text-sm font-medium text-bg shadow-lg"
              style={{ backgroundColor: labelColor(data.label) }}
            >
              {LABEL_TEXT[data.label] ?? "Bella mossa"}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="font-mono text-sm">
          <span className="text-text">{data.san}</span>
          {data.evalText && <span className="ml-2 text-text-muted">{data.evalText}</span>}
        </div>
        <Button size="sm" variant="secondary" onClick={() => setStep(0)} disabled={!atEnd}>
          ↻ Rivedi
        </Button>
      </div>
    </div>
  );
}
