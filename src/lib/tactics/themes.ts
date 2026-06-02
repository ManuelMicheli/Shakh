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
  { key: "fork", label: "Forchetta" },
  { key: "pin", label: "Inchiodatura" },
  { key: "skewer", label: "Infilata" },
  { key: "discoveredAttack", label: "Scoperta" },
  { key: "sacrifice", label: "Sacrificio" },
  { key: "deflection", label: "Deviazione" },
  { key: "hangingPiece", label: "Pezzo in presa" },
  { key: "mateIn1", label: "Matto in 1" },
  { key: "mateIn2", label: "Matto in 2" },
  { key: "backRankMate", label: "Matto del corridoio" },
  { key: "endgame", label: "Finali" },
  { key: "advancedPawn", label: "Pedone avanzato" },
];

/** Etichetta italiana di un tema (fallback alla chiave grezza). */
export function themeLabel(key: string): string {
  return TACTIC_THEMES.find((t) => t.key === key)?.label ?? key;
}
