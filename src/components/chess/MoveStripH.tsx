"use client";

import { useEffect, useRef } from "react";
import type { HistoryMove } from "@/lib/chess/useChessGame";
import { cn } from "@/lib/utils";

/**
 * Striscia mosse ORIZZONTALE per mobile: coppie numerate in monospace,
 * scorrimento laterale, mossa corrente evidenziata e tenuta in vista
 * automaticamente. Condivisa fra partita online e hotseat.
 */
export function MoveStripH({
  history,
  cursor,
  onSelect,
}: {
  history: HistoryMove[];
  cursor: number;
  onSelect: (i: number) => void;
}) {
  const activeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    activeRef.current?.scrollIntoView({ inline: "nearest", block: "nearest" });
  }, [cursor]);

  if (history.length === 0) return null;
  const pairCount = Math.ceil(history.length / 2);

  return (
    <div className="flex gap-1 overflow-x-auto rounded-md border border-border bg-surface px-2 py-1.5">
      {Array.from({ length: pairCount }).map((_, p) => {
        const wi = p * 2;
        const bi = p * 2 + 1;
        return (
          <div key={p} className="flex shrink-0 items-center gap-1">
            <span className="select-none font-mono text-[11px] tabular-nums text-text-muted/60">
              {p + 1}.
            </span>
            <button
              ref={cursor === wi ? activeRef : undefined}
              type="button"
              onClick={() => onSelect(wi)}
              className={cn(
                "rounded px-1.5 py-0.5 font-mono text-xs tabular-nums transition-colors",
                cursor === wi ? "bg-text text-bg" : "text-text hover:bg-surface-2",
              )}
            >
              {history[wi].san}
            </button>
            {history[bi] && (
              <button
                ref={cursor === bi ? activeRef : undefined}
                type="button"
                onClick={() => onSelect(bi)}
                className={cn(
                  "rounded px-1.5 py-0.5 font-mono text-xs tabular-nums transition-colors",
                  cursor === bi ? "bg-text text-bg" : "text-text hover:bg-surface-2",
                )}
              >
                {history[bi].san}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
