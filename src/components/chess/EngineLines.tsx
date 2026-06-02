"use client";

import { useMemo, useState } from "react";
import { Chess, type Square, type PieceSymbol } from "chess.js";
import {
  toWhiteRelative,
  formatEval,
} from "@/lib/engine/score";
import type { EngineLine } from "@/lib/engine/engine";
import { cn } from "@/lib/utils";

export interface EngineLinesProps {
  /** Posizione di partenza delle linee (per convertire la pv UCI in SAN). */
  fen: string;
  lines: EngineLine[];
  /** Numero massimo di semimosse mostrate per linea. */
  maxPlies?: number;
  /** Predisposizione: la useranno i moduli successivi per "giocare" la linea. */
  onSelectMove?: (uci: string, ply: number, lineIndex: number) => void;
  className?: string;
}

interface SanMove {
  uci: string;
  san: string;
}

function turnFromFen(fen: string): "w" | "b" {
  return fen.split(" ")[1] === "b" ? "b" : "w";
}

/** Converte una pv in UCI in SAN, a partire dalla FEN. Si ferma alla prima mossa illegale. */
function pvToSan(fen: string, pv: string[], maxPlies: number): SanMove[] {
  const chess = new Chess(fen);
  const out: SanMove[] = [];
  for (const uci of pv.slice(0, maxPlies)) {
    const from = uci.slice(0, 2) as Square;
    const to = uci.slice(2, 4) as Square;
    const promotion = uci.length > 4 ? (uci[4] as PieceSymbol) : undefined;
    try {
      const m = chess.move({ from, to, promotion });
      out.push({ uci, san: m.san });
    } catch {
      break;
    }
  }
  return out;
}

/** Numero di mossa iniziale (per impaginare es. "12... Nf6"). */
function startMoveNumber(fen: string): number {
  const n = Number(fen.split(" ")[5]);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

/** Pannello delle linee del motore: valutazione (mono) + linea principale in SAN. */
export function EngineLines({
  fen,
  lines,
  maxPlies = 12,
  onSelectMove,
  className,
}: EngineLinesProps) {
  const turn = turnFromFen(fen);
  const [selected, setSelected] = useState<{ line: number; ply: number } | null>(
    null,
  );

  const rendered = useMemo(
    () =>
      lines.map((line) => ({
        line,
        evalLabel: formatEval(
          toWhiteRelative(line.score, line.scoreType, turn),
          line.scoreType,
        ),
        sans: pvToSan(fen, line.pv, maxPlies),
      })),
    [lines, fen, turn, maxPlies],
  );

  if (rendered.length === 0) {
    return (
      <div className={cn("font-mono text-sm text-text-muted", className)}>
        —
      </div>
    );
  }

  const moveNumberBase = startMoveNumber(fen);
  const whiteToMove = turn === "w";

  return (
    <ul className={cn("space-y-1.5", className)}>
      {rendered.map(({ line, evalLabel, sans }, lineIndex) => (
        <li key={line.multipv} className="flex items-start gap-2 text-sm">
          <span className="mt-0.5 min-w-[3.25rem] rounded bg-surface-2 px-1.5 py-0.5 text-center font-mono text-xs font-medium text-text">
            {evalLabel}
          </span>
          <p className="flex flex-wrap gap-x-1.5 gap-y-0.5 font-mono leading-relaxed">
            {sans.map((m, ply) => {
              const moveNumber = moveNumberBase + Math.floor((ply + (whiteToMove ? 0 : 1)) / 2);
              const isWhiteMove = whiteToMove ? ply % 2 === 0 : ply % 2 === 1;
              const showNumber = isWhiteMove || ply === 0;
              const prefix = showNumber
                ? `${moveNumber}.${isWhiteMove ? "" : ".."} `
                : "";
              const active = selected?.line === lineIndex && selected?.ply === ply;
              return (
                <button
                  key={ply}
                  type="button"
                  onClick={() => {
                    setSelected({ line: lineIndex, ply });
                    onSelectMove?.(m.uci, ply, lineIndex);
                  }}
                  className={cn(
                    "rounded px-1 transition-colors hover:bg-surface-2",
                    active && "bg-text text-bg hover:bg-text",
                  )}
                >
                  <span className="text-text-muted">{prefix}</span>
                  {m.san}
                </button>
              );
            })}
          </p>
        </li>
      ))}
    </ul>
  );
}
