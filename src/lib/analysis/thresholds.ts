/**
 * Soglie di classificazione delle mosse — centralizzate e configurabili.
 * Tutto è espresso in centipawn (cp), dal punto di vista di chi muove.
 * La classificazione è puramente numerica (motore), nessun linguaggio (prompt 04).
 */

/** Perdita (loss) in cp che fa scattare ciascuna categoria. */
export const CLASSIFICATION_THRESHOLDS = {
  /** loss ≥ 300 → blunder */
  blunder: 300,
  /** 150 ≤ loss < 300 → mistake */
  mistake: 150,
  /** 50 ≤ loss < 150 → inaccuracy */
  inaccuracy: 50,
} as const;

/**
 * Vantaggio (cp, lato di chi muove) oltre il quale la posizione è considerata
 * "già decisa": un calo qui non va segnalato come dramma (evita falsi blunder
 * tipo +8 → +6). Se prima e dopo la mossa si resta sopra questa soglia, la
 * mossa non viene declassata sotto "good".
 */
export const WINNING_THRESHOLD = 600;

/** Profondità di default del motore per l'analisi (configurabile). */
export const ANALYSIS_DEPTH = 15;

/**
 * Valore in cp usato per codificare un matto in un singolo numero.
 * Un matto vale ±(MATE_SCORE − distanza), così resta distinguibile dai cp reali
 * e i matti più vicini valgono (in modulo) di più.
 */
export const MATE_SCORE = 100000;
