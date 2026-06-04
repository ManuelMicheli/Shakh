"use client";

import { useEffect, useRef, useState } from "react";
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
  label = "Analyze game",
  autoStart = false,
}: AnalyzeRunnerProps) {
  const { job, start } = useAnalysisJob();
  const [depth, setDepth] = useState(ANALYSIS_DEPTH);

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
      start(gameId, pgn, title ?? "Game", { depth });
    }
  }, [autoStart, running, otherRunning, thisJob, gameId, pgn, title, depth, start]);

  return (
    <div className="space-y-4 rounded-md border border-border bg-surface p-5">
      <div>
        <h2 className="font-display text-lg font-semibold">Engine analysis</h2>
        <p className="mt-1 text-sm text-text-muted">
          The analysis runs in parallel in your browser and keeps going even if you
          switch pages: every move is evaluated and classified.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-text-muted">Depth</span>
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
          onClick={() => start(gameId, pgn, title ?? "Game", { depth })}
          disabled={disabled}
          className="ml-auto"
        >
          {running ? "Analyzing…" : label}
        </Button>
      </div>

      <details className="rounded-md border border-border bg-surface-2 px-3 py-2 text-sm">
        <summary className="cursor-pointer font-medium text-text">
          What is depth?
        </summary>
        <div className="mt-2 space-y-2 text-xs leading-snug text-text-muted">
          <p>
            It&apos;s how many <span className="text-text">half-moves ahead</span> the
            engine calculates from each position before judging it. Higher =
            more reliable analysis, but slower (the time grows almost
            exponentially, not linearly).
          </p>
          <ul className="space-y-1">
            <li>
              <span className="font-mono text-text">12</span> — fast, for a quick
              review or blitz games.
            </li>
            <li>
              <span className="font-mono text-text">15</span> — a balance of
              precision and time (recommended).
            </li>
            <li>
              <span className="font-mono text-text">18</span> — more precise (catches
              deep tactics and sacrifices), but can take 3–5× the time of 12.
            </li>
          </ul>
          <p>
            Below ~2000 Elo, 15 and 18 rarely change the verdict on big blunders:
            keep 15 by default, and go to 18 only for important games you want to
            study in depth.
          </p>
        </div>
      </details>

      {otherRunning && (
        <p className="text-xs text-text-muted">
          Analysis running on another game: wait for it to finish.
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
            position {thisJob.current}/{thisJob.total}
          </p>
        </div>
      )}
    </div>
  );
}
