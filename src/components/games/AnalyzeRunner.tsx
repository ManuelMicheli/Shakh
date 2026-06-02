"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useGameAnalysis } from "@/lib/analysis/useGameAnalysis";
import { ANALYSIS_DEPTH } from "@/lib/analysis/thresholds";
import {
  saveAnalysisChunk,
  finalizeGameAnalysis,
} from "@/app/app/partite/actions";

const DEPTH_OPTIONS = [12, 15, 18];

export interface AnalyzeRunnerProps {
  gameId: string;
  pgn: string;
  /** Testo del pulsante (es. "Analizza" o "Rianalizza"). */
  label?: string;
}

/**
 * Avvia il job d'analisi nel worker Stockfish, mostra il progresso e salva
 * progressivamente su DB. A fine job marca la partita come analizzata.
 */
export function AnalyzeRunner({ gameId, pgn, label = "Analizza partita" }: AnalyzeRunnerProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { status, progress, error, run } = useGameAnalysis();
  const [depth, setDepth] = useState(ANALYSIS_DEPTH);
  const [finalizing, setFinalizing] = useState(false);

  const running = status === "running" || finalizing;
  const pct = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;

  const start = async () => {
    const rows = await run(pgn, {
      depth,
      onBatch: async (batch) => {
        await saveAnalysisChunk(gameId, batch);
      },
    });
    if (rows.length === 0) {
      if (error) toast({ title: "Analisi non riuscita", description: error, variant: "error" });
      return;
    }
    setFinalizing(true);
    const res = await finalizeGameAnalysis(gameId);
    setFinalizing(false);
    if (!res.ok) {
      toast({ title: "Salvataggio non riuscito", description: res.error, variant: "error" });
      return;
    }
    toast({ title: "Analisi completata", variant: "success" });
    router.refresh();
  };

  return (
    <div className="space-y-4 rounded-md border border-border bg-surface p-5">
      <div>
        <h2 className="font-display text-lg font-semibold">Analisi col motore</h2>
        <p className="mt-1 text-sm text-text-muted">
          L&apos;analisi gira nel tuo browser: ogni mossa viene valutata e classificata.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-text-muted">Profondità</span>
        <div className="flex items-center gap-1">
          {DEPTH_OPTIONS.map((d) => (
            <button
              key={d}
              type="button"
              disabled={running}
              onClick={() => setDepth(d)}
              aria-pressed={depth === d}
              className={
                "h-8 w-10 rounded-md border border-border font-mono text-xs disabled:opacity-50 " +
                (depth === d ? "bg-text text-bg" : "bg-surface-2 text-text hover:bg-surface")
              }
            >
              {d}
            </button>
          ))}
        </div>
        <Button onClick={start} disabled={running} className="ml-auto">
          {running ? "Analisi in corso…" : label}
        </Button>
      </div>

      {running && progress.total > 0 && (
        <div className="space-y-1.5">
          <div className="h-2 overflow-hidden rounded-full bg-surface-2">
            <motion.div
              className="h-full bg-text"
              initial={false}
              animate={{ width: `${pct}%` }}
              transition={{ ease: "linear", duration: 0.2 }}
            />
          </div>
          <p className="font-mono text-xs text-text-muted">
            posizione {progress.current}/{progress.total}
          </p>
        </div>
      )}
    </div>
  );
}
