"use client";

import { useEffect, useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import {
  fetchTablebase,
  moveQuality,
  type TablebaseData,
  type TablebaseResult,
  type TbCategory,
  type MoveQuality,
} from "@/lib/theory/tablebase";
import { cn } from "@/lib/utils";

export interface TablebasePanelProps {
  fen: string;
  onPlayMove?: (san: string) => void;
  className?: string;
}

const OUTCOME_LABEL: Record<MoveQuality, string> = {
  win: "Wins",
  draw: "Holds the draw",
  loss: "Loses",
  unknown: "—",
};

/** Esito assoluto della posizione per il lato al tratto. */
function positionOutcome(category: TbCategory): { label: string; quality: MoveQuality } {
  switch (category) {
    case "win":
    case "maybe-win":
      return { label: "Winning position", quality: "win" };
    case "cursed-win":
      return { label: "Winning (but 50-move rule)", quality: "win" };
    case "draw":
      return { label: "Drawn position", quality: "draw" };
    case "blessed-loss":
      return { label: "Lost (saved by the 50-move rule)", quality: "loss" };
    case "loss":
    case "maybe-loss":
      return { label: "Losing position", quality: "loss" };
    default:
      return { label: "Unknown result", quality: "unknown" };
  }
}

export function TablebasePanel({ fen, onPlayMove, className }: TablebasePanelProps) {
  const [state, setState] = useState<TablebaseResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setState(null);
    fetchTablebase(fen).then((res) => {
      if (cancelled) return;
      setState(res);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [fen]);

  return (
    <div className={cn("space-y-3", className)}>
      <h3 className="text-sm font-medium">Exact endgame (tablebase)</h3>

      {loading && (
        <p className="flex items-center gap-2 text-sm text-text-muted">
          <Spinner /> Querying the tablebase…
        </p>
      )}

      {!loading && state && !state.ok && (
        <p className="text-sm text-text-muted">
          {state.error}
          {state.tooManyPieces && " The evaluation here is the engine's (see the Engine panel)."}
        </p>
      )}

      {!loading && state?.ok && <TablebaseBody data={state.data} onPlayMove={onPlayMove} />}
    </div>
  );
}

function dtLabel(m: { dtm: number | null; dtz: number | null }): string {
  if (m.dtm != null && m.dtm !== 0) return `mate in ${Math.abs(m.dtm)}`;
  if (m.dtz != null && m.dtz !== 0) return `DTZ ${Math.abs(m.dtz)}`;
  return "";
}

function TablebaseBody({
  data,
  onPlayMove,
}: {
  data: TablebaseData;
  onPlayMove?: (san: string) => void;
}) {
  const outcome = positionOutcome(data.category);
  return (
    <div className="space-y-3">
      <div className="rounded-md border border-border bg-surface p-3">
        <p className="text-sm font-medium">{outcome.label}</p>
        {(data.dtm != null || data.dtz != null) && (
          <p className="mt-0.5 font-mono text-xs text-text-muted">{dtLabel(data)}</p>
        )}
      </div>

      {data.moves.length > 0 && (
        <ul className="space-y-0.5">
          {data.moves.map((m) => {
            const q = moveQuality(m.category);
            return (
              <li key={m.uci}>
                <button
                  type="button"
                  onClick={() => onPlayMove?.(m.san)}
                  className="flex w-full items-center justify-between gap-2 rounded px-2 py-1 text-left text-sm transition-colors hover:bg-surface-2"
                >
                  <span className="font-mono font-medium">{m.san}</span>
                  <span className="flex items-center gap-2 text-xs text-text-muted">
                    <span>{dtLabel(m)}</span>
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 font-medium",
                        q === "win" && "bg-text text-bg",
                        q === "draw" && "bg-surface-2 text-text",
                        q === "loss" && "border border-border text-text-muted",
                      )}
                    >
                      {OUTCOME_LABEL[q]}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
