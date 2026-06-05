"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { deleteGame } from "@/app/app/partite/actions";
import { useAnalysisJob, MAX_BATCH_JOBS } from "@/components/analysis/AnalysisJobContext";
import { cn } from "@/lib/utils";
import type { GameRow, PieceColor } from "@/lib/games/types";

const SOURCE_LABEL: Record<string, string> = {
  pgn: "PGN",
  lichess: "Lichess",
  chesscom: "Chess.com",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
}

function gameTitle(g: GameRow): string {
  return `${g.white ?? "?"} – ${g.black ?? "?"}`;
}

/** Risultato grezzo → notazione leggibile (½–½, 1–0). */
function formatResult(r: string | null): string {
  if (!r) return "—";
  if (r === "1/2-1/2") return "½–½";
  return r.replace("-", "–");
}

type Outcome = "win" | "draw" | "loss" | "unknown";

/** Esito dal punto di vista dell'utente (richiede `result` + `user_color`). */
function outcomeOf(g: GameRow): Outcome {
  if (!g.result || !g.user_color) return "unknown";
  if (g.result === "1/2-1/2") return "draw";
  const whiteWon = g.result === "1-0";
  const blackWon = g.result === "0-1";
  if (!whiteWon && !blackWon) return "unknown";
  const userWhite = g.user_color === "white";
  if (whiteWon) return userWhite ? "win" : "loss";
  return userWhite ? "loss" : "win";
}

/** Avversario (lato non giocato dall'utente). */
function opponentOf(g: GameRow): string {
  if (g.user_color === "white") return g.black ?? "?";
  if (g.user_color === "black") return g.white ?? "?";
  return gameTitle(g);
}

/** Pallino colore pezzo giocato dall'utente (bianco/nero) come da scacchiera. */
function ColorDot({ color }: { color: PieceColor | null }) {
  return (
    <span
      className={cn(
        "inline-block h-2.5 w-2.5 shrink-0 rounded-full border",
        color === "white"
          ? "border-border bg-bg"
          : color === "black"
            ? "border-text bg-text"
            : "border-border bg-surface-2",
      )}
    />
  );
}

/** Esito come glifo editoriale: ½ per patta, 1/0 per vittoria/sconfitta. */
function ResultMark({ outcome }: { outcome: Outcome }) {
  const mark =
    outcome === "win" ? "1" : outcome === "loss" ? "0" : outcome === "draw" ? "½" : "–";
  return (
    <span
      className={cn(
        "inline-grid h-6 w-6 place-items-center rounded-md border font-mono text-xs",
        outcome === "win" && "border-text bg-text text-bg",
        outcome === "loss" && "border-border text-text-muted",
        outcome === "draw" && "border-border text-text",
        outcome === "unknown" && "border-border text-text-muted",
      )}
    >
      {mark}
    </span>
  );
}

/**
 * Stile del tile esito. Il risultato eredita un colore a contrasto pieno con lo
 * sfondo del tile: su V (sfondo chiaro/invertito) testo scuro; su S (sfondo
 * neutro) testo a piena tinta — così è sempre leggibile.
 */
const OUTCOME_META: Record<
  Outcome,
  { letter: string; labelKey: string; tile: string; letterCls: string; resultCls: string }
> = {
  win: {
    letter: "W",
    labelKey: "outcomeWin",
    tile: "bg-text",
    letterCls: "text-bg",
    resultCls: "text-bg",
  },
  draw: {
    letter: "½",
    labelKey: "outcomeDraw",
    tile: "border border-border bg-surface",
    letterCls: "text-text",
    resultCls: "text-text-muted",
  },
  loss: {
    letter: "L",
    labelKey: "outcomeLoss",
    tile: "bg-surface-2",
    letterCls: "text-text",
    resultCls: "text-text",
  },
  unknown: {
    letter: "–",
    labelKey: "outcomeUnknown",
    tile: "bg-surface-2",
    letterCls: "text-text-muted",
    resultCls: "text-text-muted",
  },
};

export function GamesTable({ games }: { games: GameRow[] }) {
  const router = useRouter();
  const t = useTranslations("games");
  const { toast } = useToast();
  const { job, startBatch } = useAnalysisJob();
  const [pending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const analyzing = job?.status === "running";

  const onDelete = (id: string) => {
    if (!confirm(t("deleteConfirm"))) return;
    setDeletingId(id);
    startTransition(async () => {
      const res = await deleteGame(id);
      setDeletingId(null);
      if (!res.ok) {
        toast({ title: t("deleteFailed"), description: res.error, variant: "error" });
        return;
      }
      toast({ title: t("gameDeleted") });
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      router.refresh();
    });
  };

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < MAX_BATCH_JOBS) {
        next.add(id);
      } else {
        toast({
          title: t("maxGamesTitle", { max: MAX_BATCH_JOBS }),
          description: t("maxGamesDesc"),
        });
      }
      return next;
    });
  };

  const onAnalyzeSelected = () => {
    const jobs = games
      .filter((g) => selected.has(g.id) && !g.analyzed)
      .slice(0, MAX_BATCH_JOBS)
      .map((g) => ({ gameId: g.id, pgn: g.pgn, title: gameTitle(g) }));
    if (jobs.length === 0) return;
    const n = startBatch(jobs);
    setSelected(new Set());
    toast({
      title: n > 1 ? t("gamesQueued", { n }) : t("analysisStarted"),
      description: t("analyzedInBackground"),
    });
  };

  const selectedCount = useMemo(
    () => games.filter((g) => selected.has(g.id) && !g.analyzed).length,
    [games, selected],
  );

  // Banda riepilogo (desktop): record V–P–S, analizzate/totali, % vittorie.
  // Calcolata solo sui dati realmente presenti su `games`: niente accuratezza
  // (vive in `game_analysis`, non sulla riga) né rating avversario (non salvato).
  const summary = useMemo(() => {
    let wins = 0;
    let draws = 0;
    let losses = 0;
    let analyzed = 0;
    for (const g of games) {
      const o = outcomeOf(g);
      if (o === "win") wins++;
      else if (o === "draw") draws++;
      else if (o === "loss") losses++;
      if (g.analyzed) analyzed++;
    }
    const decided = wins + draws + losses;
    const winRate = decided > 0 ? Math.round((wins / decided) * 100) : 0;
    return { wins, draws, losses, analyzed, total: games.length, winRate, decided };
  }, [games]);

  if (games.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border p-10 text-center text-text-muted">
        {t("emptyState")}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {selectedCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-surface-2 px-4 py-2.5">
          <span className="text-sm text-text">
            {t("selectedCount", { count: selectedCount, max: MAX_BATCH_JOBS })}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
              {t("cancel")}
            </Button>
            <Button size="sm" onClick={onAnalyzeSelected} disabled={analyzing}>
              {analyzing ? t("analyzing") : t("analyzeSelected")}
            </Button>
          </div>
        </div>
      )}

      {/* MOBILE: card partita con tile esito (V/½/S) e risultato a contrasto. */}
      <div className="space-y-2 md:hidden">
        {games.map((g) => {
          const o = OUTCOME_META[outcomeOf(g)];
          const youColor =
            g.user_color === "white"
              ? t("colorWhite")
              : g.user_color === "black"
                ? t("colorBlack")
                : "—";
          return (
            <div
              key={g.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3"
            >
              <span
                className={cn(
                  "flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg leading-none",
                  o.tile,
                )}
                title={t(o.labelKey)}
              >
                <span className={cn("font-mono text-base font-semibold", o.letterCls)}>
                  {o.letter}
                </span>
                <span
                  className={cn(
                    "mt-0.5 font-mono text-[10px] tabular-nums",
                    o.resultCls,
                  )}
                >
                  {formatResult(g.result)}
                </span>
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  vs {opponentOf(g)}
                </p>
                <p className="mt-0.5 truncate text-xs text-text-muted">
                  {youColor} · {SOURCE_LABEL[g.source] ?? g.source} ·{" "}
                  {formatDate(g.played_at ?? g.created_at)}
                  {g.eco_code && <span className="font-mono"> · {g.eco_code}</span>}
                </p>
              </div>

              <Link
                href={`/app/partite/${g.id}`}
                className={cn(
                  "inline-flex h-9 shrink-0 items-center rounded-lg px-4 text-sm font-medium",
                  g.analyzed
                    ? "border border-border bg-surface-2 text-text"
                    : "bg-text text-bg",
                )}
              >
                {g.analyzed ? t("review") : t("analyze")}
              </Link>

              <button
                type="button"
                aria-label={t("deleteGame")}
                disabled={pending && deletingId === g.id}
                onClick={() => onDelete(g.id)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-text-muted hover:bg-surface-2 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>

      {/* DESKTOP: banda riepilogo + tabella dati densa (Ledger). */}
      <div className="hidden md:block">
        {/* Banda riepilogo: record, analizzate/totali, % vittorie. */}
        <div className="grid grid-cols-3 divide-x divide-border rounded-xl border border-border bg-surface">
          <div className="p-5">
            <p className="font-mono text-2xl font-semibold tabular-nums">
              {summary.wins}–{summary.draws}–{summary.losses}
            </p>
            <p className="mt-1 text-xs uppercase tracking-wide text-text-muted">
              {t("summaryRecord")}
            </p>
          </div>
          <div className="p-5">
            <p className="font-mono text-2xl font-semibold tabular-nums">
              {summary.analyzed}/{summary.total}
            </p>
            <p className="mt-1 text-xs uppercase tracking-wide text-text-muted">
              {t("summaryAnalyzed")}
            </p>
          </div>
          <div className="p-5">
            <p className="font-mono text-2xl font-semibold tabular-nums">
              {summary.decided > 0 ? `${summary.winRate}%` : "—"}
            </p>
            <p className="mt-1 text-xs uppercase tracking-wide text-text-muted">
              {t("summaryWinRate")}
            </p>
          </div>
        </div>

        {/* Tabella partite. */}
        <div className="mt-6 overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface text-left font-mono text-[11px] uppercase tracking-wide text-text-muted">
                <th className="w-10 px-4 py-2.5" />
                <th className="px-4 py-2.5 font-medium">{t("colDate")}</th>
                <th className="px-4 py-2.5 font-medium">{t("colOpponent")}</th>
                <th className="px-4 py-2.5 font-medium">{t("colOpening")}</th>
                <th className="px-4 py-2.5 text-center font-medium">{t("colResult")}</th>
                <th className="px-4 py-2.5 text-right font-medium">{t("colStatus")}</th>
                <th className="w-10 px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {games.map((g) => {
                const isSelected = selected.has(g.id);
                return (
                  <tr
                    key={g.id}
                    className="bg-surface transition-colors hover:bg-surface-2"
                  >
                    <td className="px-4 py-3">
                      {!g.analyzed ? (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggle(g.id)}
                          aria-label={t("selectForAnalysis", { title: gameTitle(g) })}
                          className="h-4 w-4 accent-[var(--accent)]"
                        />
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-text-muted">
                      {formatDate(g.played_at ?? g.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/app/partite/${g.id}`}
                        className="flex items-center gap-2"
                      >
                        <ColorDot color={g.user_color} />
                        <span className="truncate font-medium">{opponentOf(g)}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2 text-text-muted">
                        <span>{SOURCE_LABEL[g.source] ?? g.source}</span>
                        {g.eco_code && (
                          <span className="font-mono text-[11px]">{g.eco_code}</span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex justify-center">
                        <ResultMark outcome={outcomeOf(g)} />
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {g.analyzed ? (
                        <Link
                          href={`/app/partite/${g.id}`}
                          className="font-mono text-[11px] text-text-muted underline-offset-2 hover:text-text hover:underline"
                        >
                          {t("review")}
                        </Link>
                      ) : (
                        <Link
                          href={`/app/partite/${g.id}`}
                          className="inline-flex items-center rounded-full bg-text px-2.5 py-0.5 text-[11px] font-medium text-bg"
                        >
                          {t("analyze")}
                        </Link>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={t("deleteGame")}
                        disabled={pending && deletingId === g.id}
                        onClick={() => onDelete(g.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
