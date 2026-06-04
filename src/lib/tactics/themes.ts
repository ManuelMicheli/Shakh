/**
 * Tassonomia dei temi tattici. Le chiavi sono i temi standard di Lichess
 * (usati come `key` in `user_progress` dimensione `tactic_theme`); le etichette
 * sono bilingui per la UI. Sottoinsieme curato per la modalità "Per tema".
 */
import type { Locale } from "@/i18n/config";

export interface TacticTheme {
  key: string;
  /** Etichetta in inglese (default storico). Per IT usa `themeLabel(key, locale)`. */
  label: string;
  /** Etichetta italiana, per le viste localizzate. */
  labelIt: string;
}

export const TACTIC_THEMES: TacticTheme[] = [
  { key: "fork", label: "Fork", labelIt: "Forchetta" },
  { key: "pin", label: "Pin", labelIt: "Inchiodatura" },
  { key: "skewer", label: "Skewer", labelIt: "Infilata" },
  { key: "discoveredAttack", label: "Discovered attack", labelIt: "Attacco di scoperta" },
  { key: "sacrifice", label: "Sacrifice", labelIt: "Sacrificio" },
  { key: "deflection", label: "Deflection", labelIt: "Deviazione" },
  { key: "hangingPiece", label: "Hanging piece", labelIt: "Pezzo in presa" },
  { key: "mateIn1", label: "Mate in 1", labelIt: "Matto in 1" },
  { key: "mateIn2", label: "Mate in 2", labelIt: "Matto in 2" },
  { key: "backRankMate", label: "Back-rank mate", labelIt: "Matto della traversa" },
  { key: "endgame", label: "Endgames", labelIt: "Finali" },
  { key: "advancedPawn", label: "Advanced pawn", labelIt: "Pedone avanzato" },
];

/**
 * Etichetta localizzata di un tema (fallback alla chiave grezza).
 * `locale` opzionale: omesso → inglese, per retrocompatibilità coi chiamanti
 * che ancora non passano la lingua.
 */
export function themeLabel(key: string, locale: Locale = "en"): string {
  const theme = TACTIC_THEMES.find((t) => t.key === key);
  if (!theme) return key;
  return locale === "it" ? theme.labelIt : theme.label;
}
