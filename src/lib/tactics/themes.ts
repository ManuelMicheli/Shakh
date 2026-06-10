/**
 * Tassonomia dei temi tattici. Le chiavi sono i temi standard di Lichess
 * (usati come `key` in `user_progress` dimensione `tactic_theme` e nell'array
 * `puzzles.themes`); le etichette sono bilingui per la UI.
 *
 * Copertura completa dei temi "allenabili" del database puzzle Lichess (CC0),
 * organizzati in gruppi per la griglia "Per tema". Restano esclusi solo i tag
 * meta non didattici (lunghezza: short/long/veryLong/oneMove; provenienza:
 * master/superGM/playerGames; contenitori: mate/mix).
 */
import type { Locale } from "@/i18n/config";

export type ThemeGroupKey = "motif" | "mate" | "endgame" | "phase";

export interface TacticTheme {
  key: string;
  /** Etichetta in inglese (default storico). Per IT usa `themeLabel(key, locale)`. */
  label: string;
  /** Etichetta italiana, per le viste localizzate. */
  labelIt: string;
  /** Gruppo di appartenenza nella griglia "Per tema". */
  group: ThemeGroupKey;
}

export const THEME_GROUPS: { key: ThemeGroupKey; label: string; labelIt: string }[] = [
  { key: "motif", label: "Tactical motifs", labelIt: "Motivi tattici" },
  { key: "mate", label: "Checkmates", labelIt: "Scacchi matti" },
  { key: "endgame", label: "Endgames", labelIt: "Finali" },
  { key: "phase", label: "Phase and goal", labelIt: "Fase e obiettivo" },
];

export const TACTIC_THEMES: TacticTheme[] = [
  // ── Motivi tattici ──────────────────────────────────────────────────────────
  { key: "fork", label: "Fork", labelIt: "Forchetta", group: "motif" },
  { key: "pin", label: "Pin", labelIt: "Inchiodatura", group: "motif" },
  { key: "skewer", label: "Skewer", labelIt: "Infilata", group: "motif" },
  { key: "discoveredAttack", label: "Discovered attack", labelIt: "Attacco di scoperta", group: "motif" },
  { key: "doubleCheck", label: "Double check", labelIt: "Scacco doppio", group: "motif" },
  { key: "sacrifice", label: "Sacrifice", labelIt: "Sacrificio", group: "motif" },
  { key: "deflection", label: "Deflection", labelIt: "Deviazione", group: "motif" },
  { key: "attraction", label: "Attraction", labelIt: "Attrazione", group: "motif" },
  { key: "clearance", label: "Clearance", labelIt: "Sgombero", group: "motif" },
  { key: "interference", label: "Interference", labelIt: "Interferenza", group: "motif" },
  { key: "intermezzo", label: "Intermezzo", labelIt: "Mossa intermedia", group: "motif" },
  { key: "xRayAttack", label: "X-ray attack", labelIt: "Attacco a raggi X", group: "motif" },
  { key: "zugzwang", label: "Zugzwang", labelIt: "Zugzwang", group: "motif" },
  { key: "trappedPiece", label: "Trapped piece", labelIt: "Pezzo intrappolato", group: "motif" },
  { key: "hangingPiece", label: "Hanging piece", labelIt: "Pezzo in presa", group: "motif" },
  { key: "capturingDefender", label: "Capture the defender", labelIt: "Cattura del difensore", group: "motif" },
  { key: "exposedKing", label: "Exposed king", labelIt: "Re esposto", group: "motif" },
  { key: "attackingF2F7", label: "Attacking f2/f7", labelIt: "Attacco a f2/f7", group: "motif" },
  { key: "kingsideAttack", label: "Kingside attack", labelIt: "Attacco sull'ala di re", group: "motif" },
  { key: "queensideAttack", label: "Queenside attack", labelIt: "Attacco sull'ala di donna", group: "motif" },
  { key: "advancedPawn", label: "Advanced pawn", labelIt: "Pedone avanzato", group: "motif" },
  { key: "promotion", label: "Promotion", labelIt: "Promozione", group: "motif" },
  { key: "underPromotion", label: "Underpromotion", labelIt: "Sottopromozione", group: "motif" },
  { key: "enPassant", label: "En passant", labelIt: "En passant", group: "motif" },
  { key: "castling", label: "Castling", labelIt: "Arrocco", group: "motif" },
  { key: "quietMove", label: "Quiet move", labelIt: "Mossa tranquilla", group: "motif" },
  { key: "defensiveMove", label: "Defensive move", labelIt: "Mossa difensiva", group: "motif" },

  // ── Scacchi matti ───────────────────────────────────────────────────────────
  { key: "mateIn1", label: "Mate in 1", labelIt: "Matto in 1", group: "mate" },
  { key: "mateIn2", label: "Mate in 2", labelIt: "Matto in 2", group: "mate" },
  { key: "mateIn3", label: "Mate in 3", labelIt: "Matto in 3", group: "mate" },
  { key: "mateIn4", label: "Mate in 4", labelIt: "Matto in 4", group: "mate" },
  { key: "mateIn5", label: "Mate in 5+", labelIt: "Matto in 5+", group: "mate" },
  { key: "backRankMate", label: "Back-rank mate", labelIt: "Matto della traversa", group: "mate" },
  { key: "smotheredMate", label: "Smothered mate", labelIt: "Matto affogato", group: "mate" },
  { key: "anastasiaMate", label: "Anastasia's mate", labelIt: "Matto di Anastasia", group: "mate" },
  { key: "arabianMate", label: "Arabian mate", labelIt: "Matto arabo", group: "mate" },
  { key: "bodenMate", label: "Boden's mate", labelIt: "Matto di Boden", group: "mate" },
  { key: "doubleBishopMate", label: "Double bishop mate", labelIt: "Matto dei due alfieri", group: "mate" },
  { key: "dovetailMate", label: "Dovetail mate", labelIt: "Matto a coda di rondine", group: "mate" },
  { key: "hookMate", label: "Hook mate", labelIt: "Matto a uncino", group: "mate" },
  { key: "killBoxMate", label: "Kill box mate", labelIt: "Matto della gabbia", group: "mate" },
  { key: "vukovicMate", label: "Vuković's mate", labelIt: "Matto di Vuković", group: "mate" },

  // ── Finali ──────────────────────────────────────────────────────────────────
  { key: "endgame", label: "Endgames", labelIt: "Finali", group: "endgame" },
  { key: "pawnEndgame", label: "Pawn endgame", labelIt: "Finale di pedoni", group: "endgame" },
  { key: "rookEndgame", label: "Rook endgame", labelIt: "Finale di torri", group: "endgame" },
  { key: "bishopEndgame", label: "Bishop endgame", labelIt: "Finale di alfieri", group: "endgame" },
  { key: "knightEndgame", label: "Knight endgame", labelIt: "Finale di cavalli", group: "endgame" },
  { key: "queenEndgame", label: "Queen endgame", labelIt: "Finale di donna", group: "endgame" },
  { key: "queenRookEndgame", label: "Queen and rook endgame", labelIt: "Finale di donna e torre", group: "endgame" },

  // ── Fase e obiettivo ────────────────────────────────────────────────────────
  { key: "opening", label: "Opening", labelIt: "Apertura", group: "phase" },
  { key: "middlegame", label: "Middlegame", labelIt: "Mediogioco", group: "phase" },
  { key: "advantage", label: "Winning advantage", labelIt: "Vantaggio vincente", group: "phase" },
  { key: "crushing", label: "Crushing advantage", labelIt: "Vantaggio schiacciante", group: "phase" },
  { key: "equality", label: "Save the position", labelIt: "Salvare la posizione", group: "phase" },
];

/** Temi di un gruppo, nell'ordine dichiarato. */
export function themesOfGroup(group: ThemeGroupKey): TacticTheme[] {
  return TACTIC_THEMES.filter((t) => t.group === group);
}

/** Etichetta localizzata di un gruppo. */
export function groupLabel(key: ThemeGroupKey, locale: Locale = "en"): string {
  const g = THEME_GROUPS.find((x) => x.key === key);
  if (!g) return key;
  return locale === "it" ? g.labelIt : g.label;
}

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
