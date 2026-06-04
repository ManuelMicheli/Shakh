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
function leader(score: number): "White" | "Black" | null {
  if (score > 0) return "White";
  if (score < 0) return "Black";
  return null;
}

/**
 * Verdetto a parole su una valutazione white-relative.
 * Le soglie sono in centipawn: 100 cp = un pedone di vantaggio.
 */
export function evalVerdict(score: number, scoreType: ScoreType): EvalVerdict {
  if (scoreType === "mate") {
    const n = Math.abs(score);
    if (n === 0) return { headline: "King in checkmate", detail: "The game is over." };
    const who = score > 0 ? "White" : "Black";
    return {
      headline: `Forced mate for ${who} in ${n}`,
      detail: `With best play ${who} delivers checkmate within ${n} moves: the game is decided.`,
    };
  }

  const side = leader(score);
  const abs = Math.abs(score);
  const pawns = (abs / 100).toFixed(1);

  if (abs <= 30) {
    return {
      headline: "Balanced position",
      detail: "Neither side has a real advantage: the game is in the balance.",
    };
  }

  let strength: string;
  if (abs <= 90) strength = "slightly better";
  else if (abs <= 200) strength = "clearly better";
  else if (abs <= 500) strength = "winning";
  else strength = "completely winning";

  return {
    headline: `${side} ${strength}`,
    detail: `The number is worth about ${pawns} pawns in ${side}'s favor: the higher it is, the bigger the advantage.`,
  };
}

/** Testi d'aiuto riutilizzabili (tooltip) sui termini del motore. */
export const ENGINE_HELP = {
  eval:
    "Engine evaluation in pawns. A positive value (+) favors White, a negative one (−) favors Black. Near 0 = level position.",
  bestMove:
    "The move the engine considers best in the current position.",
  lines:
    "How many alternative moves to show. 1 = the best only; 2–3 to compare the options.",
  depth:
    "Depth: how many moves ahead the engine has calculated. The higher it is, the more reliable the analysis.",
} as const;
