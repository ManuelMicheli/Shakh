"use client";

/**
 * Schermata finale di partita: copre la scacchiera annunciando l'esito
 * ("Hai vinto" / "Hai perso" / "Patta" o, in hotseat, il colore vincente).
 * Mostra il simbolo dello scacco matto (♚#) quando la partita finisce per matto.
 * Riutilizzata da sparring, partita con un amico (online) e stesso dispositivo.
 */
export type GameOutcome = "win" | "loss" | "draw";

export function GameOverOverlay({
  title,
  subtitle,
  checkmate = false,
  onDismiss,
  actions,
}: {
  /** Esito principale, es. "Hai vinto" / "Hai perso" / "Patta". */
  title: string;
  /** Riga secondaria opzionale: motivo (abbandono, tempo, …). */
  subtitle?: string;
  /** True se la partita è finita per scacco matto: mostra il simbolo. */
  checkmate?: boolean;
  /** Chiudi l'overlay per rivedere la scacchiera. */
  onDismiss?: () => void;
  /** Pulsanti azione (rivincita, nuova partita, …). */
  actions?: React.ReactNode;
}) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center rounded-md bg-bg/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-[16rem] space-y-4 rounded-xl border border-border bg-surface p-6 text-center shadow-2xl">
        {checkmate && (
          <div className="leading-none" aria-hidden>
            <span className="font-mono text-5xl text-text">♚</span>
            <span className="ml-1 align-super font-mono text-2xl text-text">#</span>
          </div>
        )}
        <div>
          <div className="font-display text-2xl font-semibold tracking-tight text-text">
            {title}
          </div>
          {checkmate && (
            <div className="mt-1 font-mono text-[0.7rem] uppercase tracking-widest text-text-muted">
              Scacco matto
            </div>
          )}
          {subtitle && <p className="mt-2 text-sm text-text-muted">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-col gap-2">{actions}</div>}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="text-xs text-text-muted underline-offset-2 hover:text-text hover:underline"
          >
            Rivedi la partita
          </button>
        )}
      </div>
    </div>
  );
}
