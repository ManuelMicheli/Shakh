/**
 * Traduzione in linguaggio semplice dei numeri del motore, pensata per i
 * principianti. Il motore parla in "centipawn" (centesimi di pedone): qui quei
 * numeri diventano frasi comprensibili ("Bianco in leggero vantaggio").
 *
 * Lo score atteso è GIÀ relativo al Bianco (passato per toWhiteRelative): valori
 * positivi = vantaggio del Bianco, negativi = vantaggio del Nero.
 */

import type { ScoreType } from "./score";
import type { Locale } from "@/i18n/config";

export interface EvalVerdict {
  /** Verdetto breve: es. "Bianco in leggero vantaggio". */
  headline: string;
  /** Spiegazione del numero in parole semplici. */
  detail: string;
}

/** Lato in vantaggio, o null se la posizione è in equilibrio. */
function leader(score: number): "white" | "black" | null {
  if (score > 0) return "white";
  if (score < 0) return "black";
  return null;
}

const SIDE_NAME: Record<"white" | "black", { it: string; en: string }> = {
  white: { it: "Bianco", en: "White" },
  black: { it: "Nero", en: "Black" },
};

/**
 * Verdetto a parole su una valutazione white-relative.
 * Le soglie sono in centipawn: 100 cp = un pedone di vantaggio.
 * `locale` opzionale: omesso → inglese, per retrocompatibilità coi chiamanti.
 */
export function evalVerdict(
  score: number,
  scoreType: ScoreType,
  locale: Locale = "en",
): EvalVerdict {
  const it = locale === "it";
  if (scoreType === "mate") {
    const n = Math.abs(score);
    if (n === 0)
      return it
        ? { headline: "Re sotto scacco matto", detail: "La partita è finita." }
        : { headline: "King in checkmate", detail: "The game is over." };
    const who = score > 0 ? SIDE_NAME.white : SIDE_NAME.black;
    const whoName = it ? who.it : who.en;
    return it
      ? {
          headline: `Matto forzato per il ${whoName} in ${n}`,
          detail: `Col gioco migliore il ${whoName} dà scacco matto entro ${n} mosse: la partita è decisa.`,
        }
      : {
          headline: `Forced mate for ${whoName} in ${n}`,
          detail: `With best play ${whoName} delivers checkmate within ${n} moves: the game is decided.`,
        };
  }

  const side = leader(score);
  const abs = Math.abs(score);
  const pawns = (abs / 100).toFixed(1);

  if (abs <= 30) {
    return it
      ? {
          headline: "Posizione equilibrata",
          detail: "Nessuno dei due ha un vero vantaggio: la partita è in bilico.",
        }
      : {
          headline: "Balanced position",
          detail: "Neither side has a real advantage: the game is in the balance.",
        };
  }

  let strengthEn: string;
  let strengthIt: string;
  if (abs <= 90) {
    strengthEn = "slightly better";
    strengthIt = "in leggero vantaggio";
  } else if (abs <= 200) {
    strengthEn = "clearly better";
    strengthIt = "in netto vantaggio";
  } else if (abs <= 500) {
    strengthEn = "winning";
    strengthIt = "in vantaggio vincente";
  } else {
    strengthEn = "completely winning";
    strengthIt = "completamente vincente";
  }

  const sideName = side ? (it ? SIDE_NAME[side].it : SIDE_NAME[side].en) : "";
  return it
    ? {
        headline: `${sideName} ${strengthIt}`,
        detail: `Il numero vale circa ${pawns} pedoni a favore del ${sideName}: più è alto, più il vantaggio è grande.`,
      }
    : {
        headline: `${sideName} ${strengthEn}`,
        detail: `The number is worth about ${pawns} pawns in ${sideName}'s favor: the higher it is, the bigger the advantage.`,
      };
}

/** Testi d'aiuto riutilizzabili (tooltip) sui termini del motore (inglese). */
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

const ENGINE_HELP_IT: Record<keyof typeof ENGINE_HELP, string> = {
  eval:
    "Valutazione del motore in pedoni. Un valore positivo (+) favorisce il Bianco, uno negativo (−) il Nero. Vicino a 0 = posizione pari.",
  bestMove: "La mossa che il motore ritiene migliore nella posizione attuale.",
  lines:
    "Quante mosse alternative mostrare. 1 = solo la migliore; 2–3 per confrontare le opzioni.",
  depth:
    "Profondità: quante mosse in avanti ha calcolato il motore. Più è alta, più l'analisi è affidabile.",
};

/** Testo d'aiuto localizzato sui termini del motore. */
export function engineHelp(key: keyof typeof ENGINE_HELP, locale: Locale): string {
  return locale === "it" ? ENGINE_HELP_IT[key] : ENGINE_HELP[key];
}
