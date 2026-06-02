"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { deleteGame } from "@/app/app/partite/actions";
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

export function GamesTable({ games }: { games: GameRow[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
      router.refresh();
    });
  };

  if (games.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border p-10 text-center text-text-muted">
        Nessuna partita ancora. Importane una qui sopra per iniziare.
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border overflow-hidden rounded-md border border-border">
      {games.map((g) => (
        <li
          key={g.id}
          className="flex flex-wrap items-center gap-3 bg-surface px-4 py-3 sm:flex-nowrap"
        >
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
      ))}
    </ul>
  );
}
