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
  // Matchmaking online "rated" (vedi migration 0024). Le partite-amico hanno
  // `rated = false` e tutti gli snapshot a null.
  rated: boolean;
  white_rating: number | null;
  white_rd: number | null;
  black_rating: number | null;
  black_rd: number | null;
  white_rated_at: string | null;
  black_rated_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Riga della coda `matchmaking_queue` (vedi migration 0024). */
export interface MatchmakingRow {
  user_id: string;
  display_name: string | null;
  time_control_id: string;
  initial_ms: number | null;
  increment_ms: number;
  rating: number;
  rd: number;
  game_id: string | null;
  enqueued_at: string;
}
