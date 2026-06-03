/**
 * Traduzione in linguaggio semplice dei numeri del motore, pensata per i
 * principianti. Il motore parla in "centipawn" (centesimi di pedone): qui quei
 * numeri diventano frasi comprensibili ("Bianco in leggero vantaggio").
 *
 * Lo score atteso è GIÀ relativo al Bianco (passato per toWhiteRelative): valori
 * positivi = vantaggio del Bianco, negativi = vantaggio del Nero.
 */

import type { ScoreType } from "./score";

export interface EvalVerdict {
  /** Verdetto breve: es. "Bianco in leggero vantaggio". */
  headline: string;
  /** Spiegazione del numero in parole semplici. */
  detail: string;
}

/** Lato in vantaggio, o null se la posizione è in equilibrio. */
function leader(score: number): "Bianco" | "Nero" | null {
  if (score > 0) return "Bianco";
  if (score < 0) return "Nero";
  return null;
}

/**
 * Verdetto a parole su una valutazione white-relative.
 * Le soglie sono in centipawn: 100 cp = un pedone di vantaggio.
 */
export function evalVerdict(score: number, scoreType: ScoreType): EvalVerdict {
  if (scoreType === "mate") {
    const n = Math.abs(score);
    if (n === 0) return { headline: "Re sotto scacco matto", detail: "La partita è finita." };
    const who = score > 0 ? "il Bianco" : "il Nero";
    return {
      headline: `Matto forzato per ${who} in ${n}`,
      detail: `Con il gioco migliore ${who} dà scacco matto entro ${n} mosse: la partita è decisa.`,
    };
  }

  const side = leader(score);
  const abs = Math.abs(score);
  const pawns = (abs / 100).toFixed(1).replace(".", ",");

  if (abs <= 30) {
    return {
      headline: "Posizione equilibrata",
      detail: "Nessuno dei due ha un vantaggio reale: la partita è in bilico.",
    };
  }

  let strength: string;
  if (abs <= 90) strength = "in leggero vantaggio";
  else if (abs <= 200) strength = "in chiaro vantaggio";
  else if (abs <= 500) strength = "in netto vantaggio";
  else strength = "in posizione vinta";

  return {
    headline: `${side} ${strength}`,
    detail: `Il numero vale circa ${pawns} pedoni a favore del ${side}: più è alto, più il vantaggio è grande.`,
  };
}

/** Testi d'aiuto riutilizzabili (tooltip) sui termini del motore. */
export const ENGINE_HELP = {
  eval:
    "Valutazione del motore in pedoni. Un valore positivo (+) favorisce il Bianco, negativo (−) il Nero. Vicino a 0 = posizione pari.",
  bestMove:
    "La mossa che il motore considera migliore nella posizione attuale.",
  lines:
    "Quante mosse alternative mostrare. 1 = solo la migliore; 2–3 per confrontare le opzioni.",
  depth:
    "Profondità: quante mosse in avanti ha calcolato il motore. Più è alta, più l'analisi è affidabile.",
} as const;
