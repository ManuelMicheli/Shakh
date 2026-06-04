"use client";

import { useEffect, useRef, useState } from "react";
import { formatClock } from "@/lib/play/time-controls";
import { cn } from "@/lib/utils";

export interface GameClockProps {
  /** Nome del giocatore. */
  name: string;
  /**
   * Ms residui di riferimento. Se `running`, viene estrapolato dal tempo
   * trascorso da `sinceTs`; altrimenti è mostrato così com'è.
   * `null` = nessun orologio (illimitato).
   */
  ms: number | null;
  /** L'orologio sta scorrendo ora (lato al tratto, partita in corso). */
  running?: boolean;
  /** Epoch ms dell'ultima mossa (base per l'estrapolazione quando `running`). */
  sinceTs?: number | null;
  /** Evidenzia il giocatore al tratto. */
  active?: boolean;
  /** Chiamato una volta quando il tempo arriva a zero mentre scorre. */
  onFlag?: () => void;
  /** Materiale catturato dal giocatore, mostrato accanto al nome. */
  material?: React.ReactNode;
}

/**
 * Orologio di un giocatore. Mostra il tempo statico (`ms`) oppure, se `running`,
 * lo conta alla rovescia estrapolando da `sinceTs`. Usato sia per la partita
 * locale (tempo gestito dal genitore, `running=false`) sia online (estrapolato).
 */
export function GameClock({
  name,
  ms,
  running = false,
  sinceTs,
  active = false,
  onFlag,
  material,
}: GameClockProps) {
  const [, force] = useState(0);
  const flagged = useRef(false);

  useEffect(() => {
    if (!running || ms == null) return;
    const id = setInterval(() => force((n) => n + 1), 200);
    return () => clearInterval(id);
  }, [running, ms]);

  let remaining = ms;
  if (ms != null && running && sinceTs != null) {
    remaining = ms - (Date.now() - sinceTs);
  }

  useEffect(() => {
    if (remaining != null && remaining > 0) {
      flagged.current = false;
    } else if (remaining != null && remaining <= 0 && running && !flagged.current) {
      flagged.current = true;
      onFlag?.();
    }
  });

  const low = remaining != null && remaining <= 20_000 && active;

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-md border px-2 py-1 lg:px-3 lg:py-2",
        active ? "border-text bg-surface-2" : "border-border bg-surface",
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate text-xs text-text-muted lg:text-sm">{name}</span>
        {material}
      </div>
      <span
        className={cn(
          "font-mono text-base tabular-nums lg:text-xl",
          low ? "text-eval-blunder" : "text-text",
        )}
      >
        {ms == null ? "∞" : formatClock(Math.max(0, remaining ?? 0))}
      </span>
    </div>
  );
}
