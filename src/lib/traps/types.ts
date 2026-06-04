/**
 * Tipi del dominio "trappole" (prompt 06d). Rispecchiano le tabelle `traps` e
 * `user_trap_progress`. Il `body` di una trappola è una `Lesson` (formato 06a):
 * la trappola riusa il rendering della teoria, ma ha metadati propri.
 */

import type { Lesson } from "@/lib/theory/types";
import type { Locale } from "@/i18n/config";

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

// ──────────────────────────── Etichette bilingue ─────────────────────────────
// I record `*_LABEL` restano in inglese per i consumatori esistenti (catalogo,
// pagina trappola). Gli accessor `*Label(key, locale)` forniscono la variante
// localizzata che le viste possono adottare incrementalmente.

type Bilingual = { it: string; en: string };
const pick = (v: Bilingual, locale: Locale): string => (locale === "it" ? v.it : v.en);

export const CATEGORY_LABEL: Record<TrapCategory, string> = {
  opening_trap: "Opening trap",
  gambit: "Gambit",
  sacrifice: "Sacrifice",
  swindle: "Swindle",
  tactical_motif: "Tactical motif",
};

const CATEGORY_I18N: Record<TrapCategory, Bilingual> = {
  opening_trap: { it: "Trappola d'apertura", en: "Opening trap" },
  gambit: { it: "Gambetto", en: "Gambit" },
  sacrifice: { it: "Sacrificio", en: "Sacrifice" },
  swindle: { it: "Imbroglio", en: "Swindle" },
  tactical_motif: { it: "Motivo tattico", en: "Tactical motif" },
};

export function categoryLabel(key: TrapCategory, locale: Locale): string {
  return pick(CATEGORY_I18N[key], locale);
}

export const FAME_LABEL: Record<TrapFame, string> = {
  famous: "Famous",
  known: "Known",
  niche: "Niche",
  obscure: "Obscure",
};

const FAME_I18N: Record<TrapFame, Bilingual> = {
  famous: { it: "Famosa", en: "Famous" },
  known: { it: "Nota", en: "Known" },
  niche: { it: "Di nicchia", en: "Niche" },
  obscure: { it: "Oscura", en: "Obscure" },
};

export function fameLabel(key: TrapFame, locale: Locale): string {
  return pick(FAME_I18N[key], locale);
}

/** Ordine crescente di notorietà → per la manopola famose ↔ di nicchia. */
export const FAME_ORDER: TrapFame[] = ["famous", "known", "niche", "obscure"];

export const SIDE_LABEL: Record<TrapSide, string> = {
  white: "White",
  black: "Black",
};

const SIDE_I18N: Record<TrapSide, Bilingual> = {
  white: { it: "Bianco", en: "White" },
  black: { it: "Nero", en: "Black" },
};

export function sideLabel(key: TrapSide, locale: Locale): string {
  return pick(SIDE_I18N[key], locale);
}

/** Etichette bilingui dei motivi tattici (fallback alla chiave grezza). */
const MOTIF_I18N: Record<string, Bilingual> = {
  sacrifice: { it: "Sacrificio", en: "Sacrifice" },
  fork: { it: "Forchetta", en: "Fork" },
  pin: { it: "Inchiodatura", en: "Pin" },
  skewer: { it: "Infilata", en: "Skewer" },
  discoveredAttack: { it: "Attacco di scoperta", en: "Discovered attack" },
  doubleCheck: { it: "Doppio scacco", en: "Double check" },
  deflection: { it: "Deviazione", en: "Deflection" },
  smotheredMate: { it: "Matto affogato", en: "Smothered mate" },
  backRankMate: { it: "Matto della traversa", en: "Back-rank mate" },
  mate: { it: "Matto", en: "Mate" },
  attack: { it: "Attacco", en: "Attack" },
  trap: { it: "Trappola", en: "Trap" },
  underPromotion: { it: "Sottopromozione", en: "Underpromotion" },
  hangingPiece: { it: "Pezzo in presa", en: "Hanging piece" },
};

/**
 * Etichetta localizzata di un motivo (fallback alla chiave grezza).
 * `locale` opzionale: omesso → inglese, per retrocompatibilità.
 */
export function motifLabel(key: string, locale: Locale = "en"): string {
  const v = MOTIF_I18N[key];
  return v ? pick(v, locale) : key;
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
