"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ANALYSIS_DEPTH } from "@/lib/analysis/thresholds";
import { useAnalysisJob } from "@/components/analysis/AnalysisJobContext";

const DEPTH_OPTIONS = [12, 15, 18];

export interface AnalyzeRunnerProps {
  gameId: string;
  pgn: string;
  /** Titolo mostrato nella mini-tab globale (es. "Bianco – Nero"). */
  title?: string;
  /** Testo del pulsante (es. "Analizza" o "Rianalizza"). */
  label?: string;
}

/**
 * Avvia il job d'analisi nel provider globale (gira nel pool di worker e
 * prosegue anche cambiando pagina). Qui rispecchia l'avanzamento se il job
 * attivo è di QUESTA partita; se ne gira uno di un'altra, blocca l'avvio.
 */
export function AnalyzeRunner({ gameId, pgn, title, label = "Analizza partita" }: AnalyzeRunnerProps) {
  const { job, start } = useAnalysisJob();
  const [depth, setDepth] = useState(ANALYSIS_DEPTH);

  const thisJob = job && job.gameId === gameId ? job : null;
  const running = thisJob?.status === "running";
  const otherRunning = Boolean(job && job.gameId !== gameId && job.status === "running");
  const pct = thisJob && thisJob.total > 0 ? (thisJob.current / thisJob.total) * 100 : 0;
  const disabled = running || otherRunning;

  return (
    <div className="space-y-4 rounded-md border border-border bg-surface p-5">
      <div>
        <h2 className="font-display text-lg font-semibold">Analisi col motore</h2>
        <p className="mt-1 text-sm text-text-muted">
          L&apos;analisi gira in parallelo nel browser e prosegue anche se cambi
          pagina: ogni mossa viene valutata e classificata.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-text-muted">Profondità</span>
        <div className="flex items-center gap-1">
          {DEPTH_OPTIONS.map((d) => (
            <button
              key={d}
              type="button"
              disabled={disabled}
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
        <Button
          onClick={() => start(gameId, pgn, title ?? "Partita", { depth })}
          disabled={disabled}
          className="ml-auto"
        >
          {running ? "Analisi in corso…" : label}
        </Button>
      </div>

      {otherRunning && (
        <p className="text-xs text-text-muted">
          Analisi in corso su un&apos;altra partita: attendi che finisca.
        </p>
      )}

      {running && thisJob && thisJob.total > 0 && (
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
            posizione {thisJob.current}/{thisJob.total}
          </p>
        </div>
      )}
    </div>
  );
}
