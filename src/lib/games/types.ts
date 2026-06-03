/**
 * Tipi condivisi del dominio "partite" (import + analisi).
 * Rispecchiano le tabelle `games` e `game_analysis` del prompt 00.
 */

export type GameSource = "pgn" | "lichess" | "chesscom";
export type PieceColor = "white" | "black";

/** Enum `move_classification` del DB. `brilliant` resta popolato altrove (sacrifici). */
export type Classification =
  | "brilliant"
  | "great"
  | "best"
  | "excellent"
  | "good"
  | "inaccuracy"
  | "mistake"
  | "miss"
  | "blunder"
  | "book";

/** Ordine canonico di visualizzazione (legenda, riepilogo) — come la scheda di riferimento. */
export const CLASSIFICATION_ORDER = [
  "brilliant",
  "great",
  "book",
  "best",
  "excellent",
  "good",
  "inaccuracy",
  "mistake",
  "miss",
  "blunder",
] as const satisfies readonly Classification[];

/** Riga della tabella `games`. */
export interface GameRow {
  id: string;
  user_id: string;
  source: GameSource;
  external_id: string | null;
  pgn: string;
  white: string | null;
  black: string | null;
  result: string | null;
  eco_code: string | null;
  user_color: PieceColor | null;
  played_at: string | null;
  analyzed: boolean;
  /** true solo se la partita è del proprio account verificato (incide sul profilo). */
  counts_for_profile: boolean;
  created_at: string;
}

/** Riga della tabella `game_analysis` (una per semimossa). */
export interface AnalysisRow {
  ply: number;
  san: string;
  fen: string;
  /** Valutazione white-relative codificata (vedi `encodeEval`). */
  eval_before: number | null;
  eval_after: number | null;
  best_move_san: string | null;
  classification: Classification | null;
  /** Commento del coach AI (prompt 04), generato on-demand/batch. */
  ai_comment?: string | null;
}

/** Payload di una riga d'analisi prodotta dal job lato client. */
export type AnalysisRowInput = AnalysisRow;
