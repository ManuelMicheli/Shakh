/**
 * Configurazione del coach AI (API Anthropic).
 *
 * Principio del prompt 04: il MOTORE fornisce i numeri, il MODELLO le parole.
 * Qui vivono solo i parametri configurabili (modello, limiti di token); la
 * costruzione dei prompt sta in `src/lib/ai/prompts.ts` e le chiamate in
 * `src/lib/ai/coach.ts`. Nessuna chiave o chiamata API lato client.
 */

/** Stringhe-modello correnti. Centralizzate qui per cambiarle in un punto solo. */
export const AI_MODELS = {
  /** Spiegazioni, commenti e Q&A didattici: equilibrio qualità/costo. */
  coach: "claude-sonnet-4-6",
  /** Task ad alto volume e bassa criticità: più economico. */
  bulk: "claude-haiku-4-5-20251001",
} as const;

export type AiModel = (typeof AI_MODELS)[keyof typeof AI_MODELS];

/** Modello di default per le interazioni del coach. */
export const DEFAULT_COACH_MODEL: AiModel = AI_MODELS.coach;

/** Limiti di token per funzione: spiegazioni brevi, niente muri di testo. */
export const AI_MAX_TOKENS = {
  /** Spiegazione di una mossa: 2–4 frasi. */
  explain: 400,
  /** Risposta Q&A sulla posizione. */
  answer: 800,
  /** Sintesi JSON dei pattern d'errore. */
  synthesis: 700,
} as const;

/** Temperatura: bassa, le risposte devono restare ancorate ai dati del motore. */
export const AI_TEMPERATURE = 0.3;
