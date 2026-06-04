"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
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

/** Chiave i18n dell'esito assoluto della posizione per il lato al tratto. */
function positionOutcome(category: TbCategory): { labelKey: string; quality: MoveQuality } {
  switch (category) {
    case "win":
    case "maybe-win":
      return { labelKey: "tablebase.posWinning", quality: "win" };
    case "cursed-win":
      return { labelKey: "tablebase.posWinning50", quality: "win" };
    case "draw":
      return { labelKey: "tablebase.posDrawn", quality: "draw" };
    case "blessed-loss":
      return { labelKey: "tablebase.posLost50", quality: "loss" };
    case "loss":
    case "maybe-loss":
      return { labelKey: "tablebase.posLosing", quality: "loss" };
    default:
      return { labelKey: "tablebase.posUnknown", quality: "unknown" };
  }
}

export function TablebasePanel({ fen, onPlayMove, className }: TablebasePanelProps) {
  const t = useTranslations("theory");
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
      <h3 className="text-sm font-medium">{t("tablebase.title")}</h3>

      {loading && (
        <p className="flex items-center gap-2 text-sm text-text-muted">
          <Spinner /> {t("tablebase.querying")}
        </p>
      )}

      {!loading && state && !state.ok && (
        <p className="text-sm text-text-muted">
          {state.error}
          {state.tooManyPieces && ` ${t("tablebase.tooManyPieces")}`}
        </p>
      )}

      {!loading && state?.ok && <TablebaseBody data={state.data} onPlayMove={onPlayMove} />}
    </div>
  );
}

function dtLabel(
  m: { dtm: number | null; dtz: number | null },
  mateIn: (n: number) => string,
): string {
  if (m.dtm != null && m.dtm !== 0) return mateIn(Math.abs(m.dtm));
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
  const t = useTranslations("theory");
  const outcomeLabel: Record<MoveQuality, string> = {
    win: t("tablebase.outcomeWins"),
    draw: t("tablebase.outcomeHoldsDraw"),
    loss: t("tablebase.outcomeLoses"),
    unknown: "—",
  };
  const mateIn = (n: number) => t("tablebase.mateIn", { n });
  const outcome = positionOutcome(data.category);
  return (
    <div className="space-y-3">
      <div className="rounded-md border border-border bg-surface p-3">
        <p className="text-sm font-medium">{t(outcome.labelKey)}</p>
        {(data.dtm != null || data.dtz != null) && (
          <p className="mt-0.5 font-mono text-xs text-text-muted">{dtLabel(data, mateIn)}</p>
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
                    <span>{dtLabel(m, mateIn)}</span>
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 font-medium",
                        q === "win" && "bg-text text-bg",
                        q === "draw" && "bg-surface-2 text-text",
                        q === "loss" && "border border-border text-text-muted",
                      )}
                    >
                      {outcomeLabel[q]}
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
