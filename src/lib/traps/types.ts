/**
 * Tipi del dominio "trappole" (prompt 06d). Rispecchiano le tabelle `traps` e
 * `user_trap_progress`. Il `body` di una trappola è una `Lesson` (formato 06a):
 * la trappola riusa il rendering della teoria, ma ha metadati propri.
 */

import type { Lesson } from "@/lib/theory/types";

/** Mirror dell'enum DB `trap_category`. */
export type TrapCategory =
  | "opening_trap"
  | "gambit"
  | "sacrifice"
  | "swindle"
  | "tactical_motif";

/** Mirror dell'enum DB `trap_fame` (notorietà: da classica a chicca oscura). */
export type TrapFame = "famous" | "known" | "niche" | "obscure";

/** Mirror dell'enum DB `trap_side`: chi TENDE la trappola. */
export type TrapSide = "white" | "black";

/** Le due modalità di allenamento. */
export type TrapMode = "tendi" | "evita";

/** Riga `traps` completa (con `body`), per il viewer e l'allenamento. */
export interface TrapRow {
  id: string;
  slug: string;
  name: string;
  category: TrapCategory;
  fame: TrapFame;
  eco_code: string | null;
  opening_name: string | null;
  side: TrapSide;
  motif: string[];
  level: number;
  trigger_fen: string;
  line_pgn: string;
  body: Lesson;
  published: boolean;
}

/** Proiezione leggera per le card del catalogo (niente `body`). */
export interface TrapSummary {
  id: string;
  slug: string;
  name: string;
  category: TrapCategory;
  fame: TrapFame;
  eco_code: string | null;
  opening_name: string | null;
  side: TrapSide;
  motif: string[];
  level: number;
}

/** Stato SRS per-utente su una trappola (tabella `user_trap_progress`). */
export interface TrapProgress {
  seen: boolean;
  attempts: number;
  successes: number;
  ease: number;
  intervalDays: number;
  dueAt: string | null;
}

// ───────────────────────────────── Etichette IT ──────────────────────────────

export const CATEGORY_LABEL: Record<TrapCategory, string> = {
  opening_trap: "Trappola d'apertura",
  gambit: "Gambetto",
  sacrifice: "Sacrificio",
  swindle: "Astuzia (swindle)",
  tactical_motif: "Motivo tattico",
};

export const FAME_LABEL: Record<TrapFame, string> = {
  famous: "Famosa",
  known: "Conosciuta",
  niche: "Di nicchia",
  obscure: "Oscura",
};

/** Ordine crescente di notorietà → per la manopola famose ↔ di nicchia. */
export const FAME_ORDER: TrapFame[] = ["famous", "known", "niche", "obscure"];

export const SIDE_LABEL: Record<TrapSide, string> = {
  white: "Bianco",
  black: "Nero",
};

/** Etichette italiane dei motivi tattici (fallback alla chiave grezza). */
const MOTIF_LABEL: Record<string, string> = {
  sacrifice: "Sacrificio",
  fork: "Forchetta",
  pin: "Inchiodatura",
  skewer: "Infilata",
  discoveredAttack: "Scoperta",
  doubleCheck: "Doppio scacco",
  deflection: "Deviazione",
  smotheredMate: "Matto affogato",
  backRankMate: "Matto del corridoio",
  mate: "Matto",
  attack: "Attacco",
  trap: "Trappola",
  underPromotion: "Sottopromozione",
  hangingPiece: "Pezzo in presa",
};

export function motifLabel(key: string): string {
  return MOTIF_LABEL[key] ?? key;
}

/**
 * Temi che esistono anche nella modalità "Per tema" delle tattiche (05): per
 * questi il motivo può linkare ai puzzle. Per gli altri non c'è collegamento.
 */
const LINKABLE_THEMES = new Set([
  "fork",
  "pin",
  "skewer",
  "discoveredAttack",
  "sacrifice",
  "deflection",
  "hangingPiece",
  "backRankMate",
]);

/** Chiave-tema dei puzzle collegata a un motivo, o null se non collegabile. */
export function motifTacticTheme(motif: string): string | null {
  return LINKABLE_THEMES.has(motif) ? motif : null;
}
