"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Spinner } from "@/components/ui/spinner";
import {
  fetchOpeningExplorer,
  moveGames,
  type ExplorerData,
  type ExplorerDb,
  type ExplorerResult,
} from "@/lib/theory/explorer";
import { cn } from "@/lib/utils";

export interface OpeningExplorerProps {
  fen: string;
  /** Gioca la mossa cliccata nell'albero (la collega al MoveTree). */
  onPlayMove?: (san: string) => void;
  className?: string;
}

/** Barra di esito bianco / patta / nero — identità monocromatica, niente colori semantici. */
function OutcomeBar({ white, draws, black }: { white: number; draws: number; black: number }) {
  const t = useTranslations("theory");
  const total = white + draws + black;
  if (total === 0) return <div className="h-3 w-full rounded-sm bg-surface-2" />;
  const w = (white / total) * 100;
  const d = (draws / total) * 100;
  const b = (black / total) * 100;
  const pct = (n: number) => `${Math.round(n)}%`;
  return (
    <div
      className="flex h-3 w-full overflow-hidden rounded-sm border border-border"
      role="img"
      aria-label={t("explorer.outcomeAria", { white: pct(w), draws: pct(d), black: pct(b) })}
      title={t("explorer.outcomeTitle", { white: pct(w), draws: pct(d), black: pct(b) })}
    >
      <span className="bg-neutral-100" style={{ width: `${w}%` }} />
      <span className="bg-neutral-400" style={{ width: `${d}%` }} />
      <span className="bg-neutral-900" style={{ width: `${b}%` }} />
    </div>
  );
}

export function OpeningExplorer({ fen, onPlayMove, className }: OpeningExplorerProps) {
  const t = useTranslations("theory");
  const [db, setDb] = useState<ExplorerDb>("masters");
  const [state, setState] = useState<ExplorerResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setState(null);
    fetchOpeningExplorer(fen, db).then((res) => {
      if (cancelled) return;
      setState(res);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [fen, db]);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">{t("explorer.title")}</h3>
        <div className="inline-flex rounded-md border border-border bg-surface p-0.5 text-xs">
          {(["masters", "lichess"] as ExplorerDb[]).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDb(d)}
              className={cn(
                "rounded px-2 py-0.5 transition-colors",
                db === d ? "bg-text text-bg" : "text-text-muted hover:text-text",
              )}
            >
              {d === "masters" ? t("explorer.masters") : t("explorer.online")}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <p className="flex items-center gap-2 text-sm text-text-muted">
          <Spinner /> {t("explorer.querying")}
        </p>
      )}

      {!loading && state && !state.ok && (
        <p className="text-sm text-text-muted">{state.error}</p>
      )}

      {!loading && state?.ok && <ExplorerTable data={state.data} onPlayMove={onPlayMove} />}
    </div>
  );
}

function ExplorerTable({
  data,
  onPlayMove,
}: {
  data: ExplorerData;
  onPlayMove?: (san: string) => void;
}) {
  const t = useTranslations("theory");
  if (data.moves.length === 0) {
    return <p className="text-sm text-text-muted">{t("explorer.noGames")}</p>;
  }
  const totalGames = data.moves.reduce((s, m) => s + moveGames(m), 0);
  return (
    <div className="space-y-2">
      {data.opening && (
        <p className="font-mono text-xs text-text-muted">
          {data.opening.eco} · {data.opening.name}
        </p>
      )}
      <table className="w-full text-sm">
        <thead>
          <tr className="text-text-muted">
            <th className="py-1 text-left font-normal">{t("explorer.move")}</th>
            <th className="px-2 py-1 text-right font-normal">{t("explorer.games")}</th>
            <th className="py-1 text-left font-normal">{t("explorer.result")}</th>
          </tr>
        </thead>
        <tbody>
          {data.moves.map((m) => {
            const games = moveGames(m);
            const share = totalGames > 0 ? Math.round((games / totalGames) * 100) : 0;
            return (
              <tr key={m.uci} className="border-t border-border">
                <td className="py-1.5">
                  <button
                    type="button"
                    onClick={() => onPlayMove?.(m.san)}
                    className="rounded px-1 font-mono font-medium transition-colors hover:bg-surface-2"
                  >
                    {m.san}
                  </button>
                </td>
                <td className="px-2 py-1.5 text-right font-mono tabular-nums text-text-muted">
                  {games.toLocaleString("en-US")}
                  <span className="ml-1 text-xs">({share}%)</span>
                </td>
                <td className="w-1/2 py-1.5">
                  <OutcomeBar white={m.white} draws={m.draws} black={m.black} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
