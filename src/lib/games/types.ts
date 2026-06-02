/**
 * Tipi condivisi del dominio "partite" (import + analisi).
 * Rispecchiano le tabelle `games` e `game_analysis` del prompt 00.
 */

export type GameSource = "pgn" | "lichess" | "chesscom";
export type PieceColor = "white" | "black";

/** Enum `move_classification` del DB. `brilliant`/`book` esistono ma non sono popolati in questo prompt. */
export type Classification =
  | "brilliant"
  | "best"
  | "good"
  | "inaccuracy"
  | "mistake"
  | "blunder"
  | "book";

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
