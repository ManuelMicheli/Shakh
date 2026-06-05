"use client";

import { useEffect, useRef } from "react";
import type { HistoryMove } from "@/lib/chess/useChessGame";
import type { Classification } from "@/lib/games/types";
import { CLASSIFICATION_META } from "@/lib/analysis/labels";
import { MoveBadge } from "@/components/analysis/MoveBadge";
import { cn } from "@/lib/utils";

export interface MoveListProps {
  history: HistoryMove[];
  /** Indice della mossa corrente (-1 = posizione iniziale). */
  cursor: number;
  onSelect: (cursor: number) => void;
  /**
   * Classificazione per indice di mossa (chiave = indice nella storia, 0-based).
   * Quando presente, accanto alla mossa appare un marcatore col colore semantico.
   */
  classifications?: Map<number, Classification>;
  /**
   * Layout a colonna singola (una semimossa per riga: `1. e4`, `1… e5`), per
   * pannelli stretti — es. la colonna mosse accanto alla board su mobile.
   */
  compact?: boolean;
  className?: string;
}

interface Pair {
  number: number;
  white?: { san: string; index: number };
  black?: { san: string; index: number };
}

/**
 * Porta `el` in vista scorrendo SOLO il primo antenato realmente scrollabile in
 * verticale, fermandosi lì: non risale fino al documento, quindi la pagina non si
 * sposta (fix mobile: la lista mosse sotto la board non trascina più lo schermo).
 */
function scrollNearestParentIntoView(el: HTMLElement | null) {
  if (!el) return;
  let parent = el.parentElement;
  while (parent) {
    const overflowY = getComputedStyle(parent).overflowY;
    const scrollable =
      /(auto|scroll|overlay)/.test(overflowY) &&
      parent.scrollHeight > parent.clientHeight;
    if (scrollable) {
      const er = el.getBoundingClientRect();
      const pr = parent.getBoundingClientRect();
      if (er.top < pr.top) parent.scrollTop += er.top - pr.top;
      else if (er.bottom > pr.bottom) parent.scrollTop += er.bottom - pr.bottom;
      return;
    }
    parent = parent.parentElement;
  }
}

/** Raggruppa la storia lineare in coppie numerate (1. e4 e5  2. Nf3 ...). */
function toPairs(history: HistoryMove[]): Pair[] {
  const pairs: Pair[] = [];
  history.forEach((m, index) => {
    const pairIndex = Math.floor(index / 2);
    if (!pairs[pairIndex]) pairs[pairIndex] = { number: pairIndex + 1 };
    if (index % 2 === 0) pairs[pairIndex].white = { san: m.san, index };
    else pairs[pairIndex].black = { san: m.san, index };
  });
  return pairs;
}

/** Notazione SAN in monospace (JetBrains Mono), impaginata a coppie numerate. */
export function MoveList({
  history,
  cursor,
  onSelect,
  classifications,
  compact = false,
  className,
}: MoveListProps) {
  const pairs = toPairs(history);
  const activeRef = useRef<HTMLButtonElement>(null);

  // Scroll automatico per tenere visibile la mossa corrente.
  // `scrollIntoView` risalirebbe ogni antenato scrollabile FINO al viewport: su
  // mobile la lista verticale sta sotto la board, così a ogni mossa la pagina
  // "scendeva". Scorriamo SOLO il contenitore scrollabile più vicino (come
  // MoveStripH per la striscia orizzontale), senza mai toccare la finestra.
  useEffect(() => {
    scrollNearestParentIntoView(activeRef.current);
  }, [cursor]);

  if (history.length === 0) {
    return (
      <div className={cn("font-mono text-sm text-text-muted", className)}>
        No moves.
      </div>
    );
  }

  const cell = (move: { san: string; index: number } | undefined) => {
    if (!move) return <span className="px-1" />;
    const active = move.index === cursor;
    const cls = classifications?.get(move.index);
    const meta = cls ? CLASSIFICATION_META[cls] : null;
    return (
      <button
        ref={active ? activeRef : undefined}
        type="button"
        onClick={() => onSelect(move.index)}
        className={cn(
          "flex items-center gap-1 rounded px-1.5 py-0.5 text-left transition-colors hover:bg-surface-2",
          active && "bg-text text-bg hover:bg-text",
        )}
      >
        <span>{move.san}</span>
        {meta?.marked && cls && <MoveBadge classification={cls} size={15} />}
      </button>
    );
  };

  if (compact) {
    return (
      <ol
        className={cn(
          "flex flex-col gap-0.5 overflow-y-auto font-mono text-xs",
          className,
        )}
      >
        {history.map((m, i) => {
          const active = i === cursor;
          const prefix = i % 2 === 0 ? `${Math.floor(i / 2) + 1}.` : "…";
          const cls = classifications?.get(i);
          const meta = cls ? CLASSIFICATION_META[cls] : null;
          return (
            <li key={i}>
              <button
                ref={active ? activeRef : undefined}
                type="button"
                onClick={() => onSelect(i)}
                className={cn(
                  "flex w-full items-center gap-1 rounded px-1.5 py-1 text-left transition-colors hover:bg-surface-2",
                  active && "bg-text text-bg hover:bg-text",
                )}
              >
                <span className="select-none text-text-muted tabular-nums">
                  {prefix}
                </span>
                <span>{m.san}</span>
                {meta?.marked && cls && <MoveBadge classification={cls} size={15} />}
              </button>
            </li>
          );
        })}
      </ol>
    );
  }

  return (
    <ol
      className={cn(
        "grid grid-cols-[auto_1fr_1fr] gap-x-2 gap-y-0.5 overflow-y-auto font-mono text-sm",
        className,
      )}
    >
      {pairs.map((p) => (
        <li key={p.number} className="contents">
          <span className="select-none py-0.5 pr-1 text-right text-text-muted tabular-nums">
            {p.number}.
          </span>
          {cell(p.white)}
          {cell(p.black)}
        </li>
      ))}
    </ol>
  );
}
