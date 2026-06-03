"use server";

import { createClient } from "@/lib/supabase/server";
import type { Puzzle } from "@/lib/tactics/types";

interface PuzzleRow {
  id: string;
  fen: string;
  moves: string;
  rating: number;
  themes: string[] | null;
  popularity: number | null;
}

const PUZZLE_COLS = "id,fen,moves,rating,themes,popularity";
const COUNT = 4;

function toPuzzle(r: PuzzleRow): Puzzle {
  return {
    id: r.id,
    fen: r.fen,
    moves: r.moves.split(" ").filter(Boolean),
    rating: r.rating,
    themes: r.themes ?? [],
    popularity: r.popularity,
  };
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Puzzle FACILI del tema dato per la scala dei concetti (principianti). */
export async function getLadderPuzzles(theme: string): Promise<Puzzle[]> {
  const supabase = await createClient();
  // Difficoltà bassa (scala Lichess): adatta a chi sta imparando il concetto.
  for (const hi of [1000, 1300, 1700]) {
    const { data } = await supabase
      .from("puzzles")
      .select(PUZZLE_COLS)
      .gte("rating", 400)
      .lte("rating", hi)
      .contains("themes", [theme])
      .order("popularity", { ascending: false })
      .limit(60);
    const pool = (data as PuzzleRow[] | null) ?? [];
    if (pool.length >= COUNT) return shuffle(pool).slice(0, COUNT).map(toPuzzle);
  }
  return [];
}
