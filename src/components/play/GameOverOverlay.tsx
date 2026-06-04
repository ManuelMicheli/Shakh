"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Schermata finale di partita: copre la scacchiera annunciando l'esito
 * ("Hai vinto" / "Hai perso" / "Patta" o, in hotseat, il colore vincente),
 * con un emblema, il motivo della fine e una riga di statistiche sintetiche
 * della partita appena giocata (mosse, catture, vantaggio materiale).
 * Riutilizzata da sparring, partita con un amico (online) e stesso dispositivo.
 */
export type GameOutcome = "win" | "loss" | "draw";

/** Una statistica mostrata nella griglia di riepilogo. */
export interface GameStat {
  label: string;
  value: string;
}

export function GameOverOverlay({
  title,
  subtitle,
  checkmate = false,
  outcome,
  stats,
  onDismiss,
  actions,
}: {
  /** Esito principale, es. "Hai vinto" / "Hai perso" / "Patta". */
  title: string;
  /** Riga secondaria opzionale: motivo (abbandono, tempo, …). */
  subtitle?: string;
  /** True se la partita è finita per scacco matto: mostra il simbolo. */
  checkmate?: boolean;
  /** Esito dal punto di vista del giocatore: guida emblema e accento. */
  outcome?: GameOutcome;
  /** Statistiche sintetiche della partita (mosse, catture, materiale). */
  stats?: GameStat[];
  /** Chiudi l'overlay per rivedere la scacchiera. */
  onDismiss?: () => void;
  /** Pulsanti azione (rivincita, nuova partita, …). */
  actions?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="absolute inset-0 z-30 flex items-center justify-center rounded-md bg-bg/70 p-4 backdrop-blur-md"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 340, damping: 26 }}
        className="w-full max-w-[20.5rem] overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
      >
        {/* Intestazione: emblema + esito + motivo */}
        <div className="flex flex-col items-center gap-3 px-6 pb-5 pt-7">
          <Emblem outcome={outcome} checkmate={checkmate} />
          <div className="text-center">
            <h2 className="font-display text-[1.7rem] font-semibold leading-none tracking-tight text-text">
              {title}
            </h2>
            {checkmate && (
              <p className="mt-2 font-mono text-[0.68rem] uppercase tracking-[0.2em] text-text-muted">
                Checkmate
              </p>
            )}
            {subtitle && (
              <p className={cn("text-sm text-text-muted", checkmate ? "mt-1" : "mt-2")}>
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Riepilogo statistiche */}
        {stats && stats.length > 0 && (
          <div
            className="grid divide-x divide-border border-y border-border bg-bg/40"
            style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}
          >
            {stats.map((s) => (
              <div key={s.label} className="flex flex-col items-center gap-1 px-1.5 py-3">
                <span className="font-mono text-lg font-semibold tabular-nums leading-none text-text">
                  {s.value}
                </span>
                <span className="text-center text-[0.58rem] uppercase leading-tight tracking-[0.12em] text-text-muted">
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Azioni */}
        <div className="space-y-2 px-6 pb-6 pt-5">
          {actions}
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="w-full pt-1 text-xs text-text-muted underline-offset-2 transition-colors hover:text-text hover:underline"
            >
              Review the game
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

/** Cerchio con un glifo che sintetizza l'esito; badge "#" se matto. */
function Emblem({
  outcome,
  checkmate,
}: {
  outcome?: GameOutcome;
  checkmate: boolean;
}) {
  const glyph = outcome === "draw" ? "½" : outcome === "loss" ? "♚" : "♔";
  const win = outcome === "win";
  return (
    <div className="relative">
      <motion.div
        initial={{ scale: 0.4, rotate: -8, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.05 }}
        className={cn(
          "flex h-16 w-16 items-center justify-center rounded-full border",
          win
            ? "border-transparent bg-text text-bg shadow-lg"
            : "border-border bg-bg text-text",
        )}
      >
        <span className="font-mono text-3xl leading-none">{glyph}</span>
      </motion.div>
      {checkmate && (
        <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-surface font-mono text-sm font-semibold text-text">
          #
        </span>
      )}
    </div>
  );
}
