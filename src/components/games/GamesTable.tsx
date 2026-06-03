"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { deleteGame } from "@/app/app/partite/actions";
import { useAnalysisJob, MAX_BATCH_JOBS } from "@/components/analysis/AnalysisJobContext";
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
  return d.toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" });
}

function gameTitle(g: GameRow): string {
  return `${g.white ?? "?"} – ${g.black ?? "?"}`;
}

export function GamesTable({ games }: { games: GameRow[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const { job, startBatch } = useAnalysisJob();
  const [pending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const analyzing = job?.status === "running";

  const onDelete = (id: string) => {
    if (!confirm("Eliminare questa partita e la sua analisi?")) return;
    setDeletingId(id);
    startTransition(async () => {
      const res = await deleteGame(id);
      setDeletingId(null);
      if (!res.ok) {
        toast({ title: "Eliminazione non riuscita", description: res.error, variant: "error" });
        return;
      }
      toast({ title: "Partita eliminata" });
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
          title: `Massimo ${MAX_BATCH_JOBS} partite per volta`,
          description: "Deseleziona una partita per sceglierne un'altra.",
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
      title: n > 1 ? `${n} partite in coda` : "Analisi avviata",
      description: "Vengono analizzate una alla volta in background.",
    });
  };

  const selectedCount = useMemo(
    () => games.filter((g) => selected.has(g.id) && !g.analyzed).length,
    [games, selected],
  );

  if (games.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border p-10 text-center text-text-muted">
        Nessuna partita ancora. Importane una qui sopra per iniziare.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {selectedCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-surface-2 px-4 py-2.5">
          <span className="text-sm text-text">
            {selectedCount} di {MAX_BATCH_JOBS} selezionate
          </span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
              Annulla
            </Button>
            <Button size="sm" onClick={onAnalyzeSelected} disabled={analyzing}>
              {analyzing ? "Analisi in corso…" : "Analizza selezionate"}
            </Button>
          </div>
        </div>
      )}

      <ul className="divide-y divide-border overflow-hidden rounded-md border border-border">
        {games.map((g) => {
          const isSelected = selected.has(g.id);
          return (
            <li
              key={g.id}
              className="flex flex-wrap items-center gap-3 bg-surface px-4 py-3 sm:flex-nowrap"
            >
              {!g.analyzed && (
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggle(g.id)}
                  aria-label={`Seleziona ${gameTitle(g)} per l'analisi`}
                  className="h-4 w-4 shrink-0 accent-[var(--accent)]"
                />
              )}

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 font-mono text-sm text-text">
                  <span className="truncate">{g.white ?? "?"}</span>
                  <span className="text-text-muted">vs</span>
                  <span className="truncate">{g.black ?? "?"}</span>
                  {g.result && (
                    <span className="text-text-muted">· {g.result}</span>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-text-muted">
                  <span>{SOURCE_LABEL[g.source] ?? g.source}</span>
                  <span>· {formatDate(g.played_at ?? g.created_at)}</span>
                  {g.eco_code && <span className="font-mono">· {g.eco_code}</span>}
                </div>
              </div>

              <Badge variant={g.analyzed ? "default" : "muted"}>
                {g.analyzed ? "analizzata" : "da analizzare"}
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
                  {g.analyzed ? "Rivedi" : "Analizza"}
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Elimina partita"
                  disabled={pending && deletingId === g.id}
                  onClick={() => onDelete(g.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
