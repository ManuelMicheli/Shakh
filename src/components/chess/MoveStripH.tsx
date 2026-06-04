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
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const c = containerRef.current;
    const a = activeRef.current;
    if (!c || !a) return;
    // Scorri SOLO la striscia, mai la pagina: `scrollIntoView` risalirebbe gli
    // antenati scrollabili (fino al viewport), causando lo zoom/spostamento su
    // mobile. Centriamo la mossa attiva agendo unicamente su questo contenitore.
    const cr = c.getBoundingClientRect();
    const ar = a.getBoundingClientRect();
    const delta = ar.left - cr.left - c.clientWidth / 2 + ar.width / 2;
    c.scrollBy({ left: delta, behavior: "smooth" });
  }, [cursor]);

  if (history.length === 0) return null;
  const pairCount = Math.ceil(history.length / 2);

  return (
    // Scroller = blocco a larghezza vincolata al genitore (`w-full min-w-0`): la sua
    // larghezza NON dipende dal contenuto, quindi non può crescere con le mosse né
    // spostare la scacchiera. Il contenuto flex `w-max` interno tiene la larghezza
    // naturale e scorre sotto (barra orizzontale), come richiesto.
    <div
      ref={containerRef}
      className="w-full min-w-0 max-w-full overflow-x-auto overscroll-x-contain rounded-md border border-border bg-surface [touch-action:pan-x]"
    >
      <div className="flex w-max gap-1 px-2 py-1.5">
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
    </div>
  );
}
