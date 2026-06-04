"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { deleteGame } from "@/app/app/partite/actions";
import { useAnalysisJob, MAX_BATCH_JOBS } from "@/components/analysis/AnalysisJobContext";
import { cn } from "@/lib/utils";
import type { GameRow } from "@/lib/games/types";

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

      {/* DESKTOP: lista densa con selezione batch. */}
      <ul className="hidden divide-y divide-border overflow-hidden rounded-md border border-border md:block">
        {games.map((g) => {
          const isSelected = selected.has(g.id);
          return (
            <li
              key={g.id}
              className="flex flex-col gap-3 bg-surface px-4 py-3 sm:flex-row sm:flex-nowrap sm:items-center"
            >
              <div className="flex min-w-0 flex-1 items-start gap-3">
                {!g.analyzed && (
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggle(g.id)}
                    aria-label={t("selectForAnalysis", { title: gameTitle(g) })}
                    className="mt-1 h-4 w-4 shrink-0 accent-[var(--accent)] sm:mt-0"
                  />
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-sm text-text">
                    <span className="break-words">{g.white ?? "?"}</span>
                    <span className="text-text-muted">vs</span>
                    <span className="break-words">{g.black ?? "?"}</span>
                    {g.result && (
                      <span className="text-text-muted">· {g.result}</span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-text-muted">
                    <span>{SOURCE_LABEL[g.source] ?? g.source}</span>
                    <span>· {formatDate(g.played_at ?? g.created_at)}</span>
                    {g.eco_code && <span className="font-mono">· {g.eco_code}</span>}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 sm:justify-end">
                <Badge variant={g.analyzed ? "default" : "muted"}>
                  {g.analyzed ? t("badgeAnalyzed") : t("badgeNotAnalyzed")}
                </Badge>

                <div className="flex items-center gap-1">
                  <Link
                    href={`/app/partite/${g.id}`}
                    className={
                      "inline-flex h-8 items-center justify-center rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 " +
                      (g.analyzed
                        ? "border border-border bg-surface-2 text-text hover:bg-surface"
                        : "bg-text text-bg hover:opacity-90")
                    }
                  >
                    {g.analyzed ? t("review") : t("analyze")}
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t("deleteGame")}
                    disabled={pending && deletingId === g.id}
                    onClick={() => onDelete(g.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
