/**
 * Stima del livello di partenza dal diagnostico (prompt 07, §2).
 * Logica pura, condivisa tra client (anteprima) e Server Action (persistenza).
 */

/** Risposte all'autovalutazione. */
export interface SelfAssessment {
  /** Conosce come muovono i pezzi. */
  knowsRules: boolean;
  /** Rating online dichiarato (se gioca), altrimenti null. */
  onlineRating: number | null;
  /** Esperienza: 'new' (<6 mesi) | 'some' (qualche anno) | 'experienced'. */
  experience: "new" | "some" | "experienced";
}

/** Esito di un puzzle del mini-test. */
export interface MiniTestResult {
  rating: number;
  solved: boolean;
}

export interface Diagnosis {
  /** Rating tattico stimato (inizializza `user_tactic_stats.rating`). */
  tacticRating: number;
  /** Stima Elo complessiva (`profiles.elo_estimate`). */
  eloEstimate: number;
  /** Livello di partenza nel percorso: i livelli inferiori risultano completati. */
  startingLevel: number;
}

const clamp = (n: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, n));

/** Baseline iniziale dall'autovalutazione, prima del mini-test. */
export function baselineFromSelf(self: SelfAssessment): number {
  if (!self.knowsRules) return 600;
  if (self.onlineRating && self.onlineRating > 0) return clamp(self.onlineRating, 600, 2400);
  switch (self.experience) {
    case "experienced":
      return 1400;
    case "some":
      return 1100;
    default:
      return 800;
  }
}

/** Mappa un rating in livello di partenza del percorso (0..4). */
export function levelFromRating(rating: number): number {
  if (rating < 900) return 0;
  if (rating < 1200) return 1;
  if (rating < 1500) return 2;
  if (rating < 1800) return 3;
  return 4;
}

/**
 * Combina autovalutazione e mini-test in una diagnosi. Il mini-test produce una
 * "performance rating" (puzzle risolto ≈ il suo rating; fallito ≈ rating-300),
 * mediata 50/50 con la baseline dichiarata per smorzare gli outlier.
 */
export function diagnose(self: SelfAssessment, results: MiniTestResult[]): Diagnosis {
  const baseline = baselineFromSelf(self);

  let tacticRating = baseline;
  if (results.length > 0) {
    const perf =
      results.reduce((sum, r) => sum + (r.solved ? r.rating : r.rating - 300), 0) /
      results.length;
    tacticRating = Math.round((baseline + perf) / 2);
  }
  tacticRating = clamp(tacticRating, 600, 2200);

  return {
    tacticRating,
    eloEstimate: tacticRating,
    startingLevel: levelFromRating(tacticRating),
  };
}
