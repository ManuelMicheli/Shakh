/**
 * Normalizzazione e formattazione delle valutazioni del motore.
 * UCI restituisce lo score DAL PUNTO DI VISTA del lato al tratto; le interfacce
 * mostrano sempre la valutazione RELATIVA AL BIANCO (positivo = vantaggio Bianco).
 * Tutte le valutazioni mostrate all'utente devono passare da qui.
 */

export type ScoreType = "cp" | "mate";

/** Inverte il segno se il tratto è al Nero, così lo score diventa relativo al Bianco. */
export function toWhiteRelative(
  score: number,
  _scoreType: ScoreType,
  turn: "w" | "b",
): number {
  return turn === "b" ? -score : score;
}

/**
 * Stringa da mostrare in monospace.
 * - centipawn → pedoni con un decimale, segno esplicito: `+1.4`, `-0.7`, `0.0`
 * - matto → `M5` (matto a favore del Bianco), `-M3` (a favore del Nero)
 * Lo score atteso è GIÀ relativo al Bianco (passato per `toWhiteRelative`).
 */
export function formatEval(score: number, scoreType: ScoreType): string {
  if (scoreType === "mate") {
    if (score === 0) return "M0";
    const n = Math.abs(score);
    return score > 0 ? `M${n}` : `-M${n}`;
  }
  const pawns = score / 100;
  const sign = pawns > 0 ? "+" : pawns < 0 ? "-" : "";
  return `${sign}${Math.abs(pawns).toFixed(1)}`;
}
