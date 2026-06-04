"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
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
  /** Avvia l'analisi automaticamente al montaggio (es. arrivo da "Analyze game"). */
  autoStart?: boolean;
}

/**
 * Avvia il job d'analisi nel provider globale (gira nel pool di worker e
 * prosegue anche cambiando pagina). Qui rispecchia l'avanzamento se il job
 * attivo è di QUESTA partita; se ne gira uno di un'altra, blocca l'avvio.
 */
export function AnalyzeRunner({
  gameId,
  pgn,
  title,
  label,
  autoStart = false,
}: AnalyzeRunnerProps) {
  const t = useTranslations("games");
  const { job, start } = useAnalysisJob();
  const [depth, setDepth] = useState(ANALYSIS_DEPTH);
  // Etichetta del pulsante (default tradotto) e titolo di fallback per la mini-tab.
  const buttonLabel = label ?? t("analyzeGame");
  const jobTitle = title ?? t("defaultGameTitle");

  const thisJob = job && job.gameId === gameId ? job : null;
  const running = thisJob?.status === "running";
  const otherRunning = Boolean(job && job.gameId !== gameId && job.status === "running");
  const pct = thisJob && thisJob.total > 0 ? (thisJob.current / thisJob.total) * 100 : 0;
  const disabled = running || otherRunning;

  // Auto-avvio una sola volta (arrivo da "Analyze game"): solo se nessun job
  // è già attivo per questa o altre partite.
  const autoStarted = useRef(false);
  useEffect(() => {
    // Parte se richiesto e non c'è già un job IN CORSO (di questa o altra
    // partita). Un job concluso/in errore non deve bloccare l'auto-avvio.
    if (autoStart && !autoStarted.current && !running && !otherRunning && !thisJob) {
      autoStarted.current = true;
      start(gameId, pgn, jobTitle, { depth });
    }
  }, [autoStart, running, otherRunning, thisJob, gameId, pgn, jobTitle, depth, start]);

  return (
    <div className="space-y-4 rounded-md border border-border bg-surface p-5">
      <div>
        <h2 className="font-display text-lg font-semibold">{t("engineAnalysis")}</h2>
        <p className="mt-1 text-sm text-text-muted">
          {t("engineAnalysisDesc")}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-text-muted">{t("depth")}</span>
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
          onClick={() => start(gameId, pgn, jobTitle, { depth })}
          disabled={disabled}
          className="ml-auto"
        >
          {running ? t("analyzing") : buttonLabel}
        </Button>
      </div>

      <details className="rounded-md border border-border bg-surface-2 px-3 py-2 text-sm">
        <summary className="cursor-pointer font-medium text-text">
          {t("whatIsDepth")}
        </summary>
        <div className="mt-2 space-y-2 text-xs leading-snug text-text-muted">
          <p>
            {t.rich("depthExplain", {
              strong: (chunks) => <span className="text-text">{chunks}</span>,
            })}
          </p>
          <ul className="space-y-1">
            <li>
              {t.rich("depth12", {
                code: (chunks) => <span className="font-mono text-text">{chunks}</span>,
              })}
            </li>
            <li>
              {t.rich("depth15", {
                code: (chunks) => <span className="font-mono text-text">{chunks}</span>,
              })}
            </li>
            <li>
              {t.rich("depth18", {
                code: (chunks) => <span className="font-mono text-text">{chunks}</span>,
              })}
            </li>
          </ul>
          <p>
            {t("depthAdvice")}
          </p>
        </div>
      </details>

      {otherRunning && (
        <p className="text-xs text-text-muted">
          {t("otherGameRunning")}
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
            {t("positionProgress", { current: thisJob.current, total: thisJob.total })}
          </p>
        </div>
      )}
    </div>
  );
}
