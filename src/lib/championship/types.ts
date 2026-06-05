/** Tipi del Campionato (vedi migration 0025). */

export type SeasonStatus = "open" | "active" | "closed";

export interface SeasonRow {
  id: string;
  code: string;
  label: string | null;
  status: SeasonStatus;
  time_control_id: string;
  starts_at: string;
  ends_at: string | null;
  created_at: string;
}

export interface GroupRow {
  id: string;
  season_id: string;
  division: string;
  idx: number;
  label: string | null;
  created_at: string;
}

export interface MemberRow {
  id: string;
  season_id: string;
  group_id: string;
  division: string;
  user_id: string;
  display_name: string | null;
  seed_rating: number;
  points: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  whites: number;
  blacks: number;
  last_color: "w" | "b" | null;
  forfeits: number;
  penalty: number;
  final_rank: number | null;
  rank_shift: number | null;
  joined_at: string;
}

export interface ChampGameRow {
  id: string;
  season_id: string;
  group_id: string;
  friend_game_id: string | null;
  white_user_id: string;
  black_user_id: string;
  pair_lo: string;
  pair_hi: string;
  status: "ongoing" | "finished";
  result: string | null;
  scored: boolean;
  created_at: string;
}

/** Numero di partite di un girone pieno (round-robin a 8 → 7 turni). */
export const GROUP_SIZE = 8;
export const GAMES_PER_SEASON = GROUP_SIZE - 1;

/** Classifica ordinata di un girone, col netto punti − penalità. */
export function rankMembers(members: MemberRow[]): MemberRow[] {
  return [...members].sort((a, b) => {
    const na = a.points - a.penalty;
    const nb = b.points - b.penalty;
    if (nb !== na) return nb - na;
    if (b.seed_rating !== a.seed_rating) return b.seed_rating - a.seed_rating;
    return a.joined_at.localeCompare(b.joined_at);
  });
}
