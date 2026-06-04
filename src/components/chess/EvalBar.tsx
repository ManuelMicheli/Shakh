"use client";

import { motion } from "framer-motion";
import { formatEval, type ScoreType } from "@/lib/engine/score";
import { evalVerdict } from "@/lib/engine/explain";
import { cn } from "@/lib/utils";

export interface EvalBarProps {
  /** Valutazione GIÀ relativa al Bianco (cp o mosse al matto). */
  score: number;
  scoreType: ScoreType;
  /** Allinea la barra all'orientamento della board: 'white' = Bianco in basso. */
  orientation?: "white" | "black";
  className?: string;
}

/** Mappa i centipawn (white-relative) su % di riempimento Bianco, curva morbida con plateau ~±10 pedoni. */
function whitePercent(score: number, scoreType: ScoreType): number {
  if (scoreType === "mate") {
    if (score > 0) return 100;
    if (score < 0) return 0;
    return 50;
  }
  const pct = 50 + 50 * (2 / Math.PI) * Math.atan(score / 350);
  return Math.max(0, Math.min(100, pct));
}

/**
 * Barra di valutazione verticale, letteralmente bianco/nero.
 * Porzione bianca = vantaggio Bianco, porzione nera = vantaggio Nero.
 */
export function EvalBar({
  score,
  scoreType,
  orientation = "white",
  className,
}: EvalBarProps) {
  const pct = whitePercent(score, scoreType);
  const label = formatEval(score, scoreType);
  const verdict = evalVerdict(score, scoreType);
  const whiteAtBottom = orientation === "white";
  const whiteWinning = scoreType === "mate" ? score > 0 : score >= 0;

  return (
    <div
      className={cn(
        "relative h-full w-6 cursor-help overflow-hidden rounded border border-border bg-neutral-900",
        className,
      )}
      role="img"
      aria-label={`Evaluation ${label}: ${verdict.headline}`}
      title={`${label} — ${verdict.headline}. ${verdict.detail}`}
    >
      {/* Sfondo = lato Nero. Riempimento animato = lato Bianco. */}
      <motion.div
        className="absolute inset-x-0 bg-neutral-50"
        style={whiteAtBottom ? { bottom: 0 } : { top: 0 }}
        initial={false}
        animate={{ height: `${pct}%` }}
        transition={{ type: "spring", stiffness: 120, damping: 20 }}
      />
      {/* Etichetta numerica all'estremità del lato vincente. */}
      <span
        className={cn(
          "absolute inset-x-0 text-center font-mono text-[0.6rem] leading-tight",
          whiteWinning ? "text-neutral-900" : "text-neutral-50",
          whiteWinning === whiteAtBottom ? "bottom-0.5" : "top-0.5",
        )}
      >
        {label}
      </span>
    </div>
  );
}
