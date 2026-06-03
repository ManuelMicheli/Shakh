"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { Square } from "chess.js";
import type { DrawShape } from "chessground/draw";
import { Button } from "@/components/ui/button";
import type { ReelData } from "@/lib/reel/payload";
import { CLASSIFICATION_ORDER, type Classification } from "@/lib/games/types";

const ChessBoard = dynamic(
  () => import("@/components/chess/ChessBoard").then((m) => m.ChessBoard),
  { ssr: false },
);

const STEP_MS = 1100;

// L'etichetta della mossa chiave è una classificazione del motore: la valido,
// con fallback su "good" se arriva una stringa inattesa.
function toClassification(label: string): Classification {
  return (CLASSIFICATION_ORDER as readonly string[]).includes(label)
    ? (label as Classification)
    : "good";
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
    <div className="mx-auto w-full max-w-md space-y-3 lg:max-w-xl">
      {data.title && <p className="text-center text-sm text-text-muted">{data.title}</p>}

      <div className="relative">
        <ChessBoard
          fen={data.fens[step]}
          orientation={data.orientation}
          mode="view"
          coordinates={false}
          lastMove={lastMove}
          shapes={shapes}
          moveGlyph={
            atEnd
              ? { square: data.to as Square, classification: toClassification(data.label) }
              : null
          }
        />
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
