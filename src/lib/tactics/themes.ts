/**
 * Tassonomia dei temi tattici. Le chiavi sono i temi standard di Lichess
 * (usati come `key` in `user_progress` dimensione `tactic_theme`); le etichette
 * sono in italiano per la UI. Sottoinsieme curato per la modalità "Per tema".
 */
export interface TacticTheme {
  key: string;
  label: string;
}

export const TACTIC_THEMES: TacticTheme[] = [
  { key: "fork", label: "Fork" },
  { key: "pin", label: "Pin" },
  { key: "skewer", label: "Skewer" },
  { key: "discoveredAttack", label: "Discovered attack" },
  { key: "sacrifice", label: "Sacrifice" },
  { key: "deflection", label: "Deflection" },
  { key: "hangingPiece", label: "Hanging piece" },
  { key: "mateIn1", label: "Mate in 1" },
  { key: "mateIn2", label: "Mate in 2" },
  { key: "backRankMate", label: "Back-rank mate" },
  { key: "endgame", label: "Endgames" },
  { key: "advancedPawn", label: "Advanced pawn" },
];

/** Etichetta italiana di un tema (fallback alla chiave grezza). */
export function themeLabel(key: string): string {
  return TACTIC_THEMES.find((t) => t.key === key)?.label ?? key;
}
