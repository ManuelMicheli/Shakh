"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAnalysisJob } from "./AnalysisJobContext";

/**
 * Mini-tab globale dell'analisi: segue l'utente in ogni pagina sotto /app.
 * Mostra l'avanzamento mentre il job gira e, a fine, propone di aprire la
 * partita analizzata. Renderizzata dall'AppShell, sopra i toast.
 */
export function AnalysisMiniTab() {
  const { job, queueLength, cancel, dismiss } = useAnalysisJob();

  const pct =
    job && job.total > 0 ? Math.round((job.current / job.total) * 100) : 0;

  return (
    <AnimatePresence>
      {job && (
        <motion.div
          key="analysis-mini-tab"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.2 }}
          role="status"
          aria-live="polite"
          className="fixed bottom-24 right-4 z-50 w-72 rounded-md border border-border bg-surface p-4 shadow-lg"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium text-text">
              {job.status === "running" && "Analisi in corso"}
              {job.status === "done" && "Analisi completata"}
              {job.status === "error" && "Analisi non riuscita"}
            </p>
            {job.status !== "running" && (
              <button
                type="button"
                onClick={dismiss}
                aria-label="Chiudi"
                className="-mr-1 -mt-1 rounded p-1 text-text-muted hover:text-text"
              >
                ✕
              </button>
            )}
          </div>

          <p className="mt-0.5 truncate text-xs text-text-muted" title={job.title}>
            {job.title}
          </p>

          {queueLength > 0 && (
            <p className="mt-0.5 font-mono text-xs text-text-muted">
              ancora {queueLength} in coda
            </p>
          )}

          {job.status === "running" && (
            <div className="mt-3 space-y-1.5">
              <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                <motion.div
                  className="h-full bg-text"
                  initial={false}
                  animate={{ width: `${pct}%` }}
                  transition={{ ease: "linear", duration: 0.2 }}
                />
              </div>
              <div className="flex items-center justify-between">
                <p className="font-mono text-xs text-text-muted">
                  {job.total > 0 ? `posizione ${job.current}/${job.total}` : "avvio…"}
                </p>
                <button
                  type="button"
                  onClick={cancel}
                  className="text-xs text-text-muted underline-offset-2 hover:text-text hover:underline"
                >
                  Annulla
                </button>
              </div>
            </div>
          )}

          {job.status === "done" && (
            <div className="mt-3 flex items-center gap-2">
              <Link
                href={`/app/partite/${job.gameId}`}
                onClick={dismiss}
                className={cn(
                  "inline-flex h-8 flex-1 items-center justify-center rounded-md px-3 text-sm font-medium",
                  "bg-text text-bg hover:opacity-90",
                )}
              >
                Apri
              </Link>
            </div>
          )}

          {job.status === "error" && job.error && (
            <p className="mt-2 text-xs text-eval-blunder">{job.error}</p>
          )}
          {job.status === "error" && (
            <div className="mt-3">
              <Button variant="secondary" size="sm" onClick={dismiss} className="w-full">
                Chiudi
              </Button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
