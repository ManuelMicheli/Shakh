import type { Square, PieceSymbol } from "chess.js";

export type FriendGameStatus = "waiting" | "ongoing" | "finished" | "aborted";

/** Una mossa salvata nella partita online. `fen` è la posizione risultante. */
export interface FriendMove {
  san: string;
  from: Square;
  to: Square;
  promotion?: PieceSymbol;
  fen: string;
}

/** Riga della tabella `friend_games` (vedi migration 0015). */
export interface FriendGameRow {
  id: string;
  start_fen: string;
  fen: string;
  pgn: string;
  moves: FriendMove[];
  turn: "w" | "b";
  status: FriendGameStatus;
  white_user_id: string | null;
  black_user_id: string | null;
  white_name: string | null;
  black_name: string | null;
  creator_color: "w" | "b";
  initial_ms: number | null;
  increment_ms: number;
  white_ms: number | null;
  black_ms: number | null;
  last_move_at: string | null;
  result: string | null;
  end_reason: string | null;
  draw_offer_by: "w" | "b" | null;
  created_at: string;
  updated_at: string;
}
