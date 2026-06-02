/**
 * Lettura/selezione dei puzzle e delle statistiche tattiche.
 * Modulo NON "use server": funzioni pure di accesso al DB, condivise tra il
 * Server Component della pagina e le Server Actions. Ricevono un client
 * Supabase già autenticato (la RLS fa rispettare la proprietà dei dati).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Puzzle, TacticMode, TacticStats } from "./types";

type DB = SupabaseClient;

interface PuzzleRow {
  id: string;
  fen: string;
  moves: string;
  rating: number;
  themes: string[] | null;
  popularity: number | null;
}

const PUZZLE_COLS = "id,fen,moves,rating,themes,popularity";

const DEFAULT_STATS: TacticStats = {
  rating: 1200,
  ratingDeviation: 350,
  puzzlesSolved: 0,
  puzzlesFailed: 0,
  currentStreak: 0,
  bestStreak: 0,
};

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

interface StatsRow {
  rating: number;
  rating_deviation: number;
  puzzles_solved: number;
  puzzles_failed: number;
  current_streak: number;
  best_streak: number;
}

function rowToStats(r: StatsRow): TacticStats {
  return {
    rating: r.rating,
    ratingDeviation: r.rating_deviation,
    puzzlesSolved: r.puzzles_solved,
    puzzlesFailed: r.puzzles_failed,
    currentStreak: r.current_streak,
    bestStreak: r.best_streak,
  };
}

/** Legge la riga stats dell'utente, creandola al primo accesso se assente. */
export async function ensureStats(supabase: DB, userId: string): Promise<TacticStats> {
  const { data } = await supabase
    .from("user_tactic_stats")
    .select("rating,rating_deviation,puzzles_solved,puzzles_failed,current_streak,best_streak")
    .eq("user_id", userId)
    .maybeSingle<StatsRow>();
  if (data) return rowToStats(data);

  const { data: inserted } = await supabase
    .from("user_tactic_stats")
    .insert({ user_id: userId })
    .select("rating,rating_deviation,puzzles_solved,puzzles_failed,current_streak,best_streak")
    .maybeSingle<StatsRow>();
  return inserted ? rowToStats(inserted) : DEFAULT_STATS;
}

/** Id dei puzzle tentati di recente dall'utente (per non riproporli subito). */
async function recentlySeenIds(supabase: DB, userId: string, limit = 150): Promise<string[]> {
  const { data } = await supabase
    .from("user_puzzle_attempts")
    .select("puzzle_id")
    .eq("user_id", userId)
    .order("attempted_at", { ascending: false })
    .limit(limit);
  return Array.from(new Set((data ?? []).map((r) => r.puzzle_id as string)));
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export interface SelectParams {
  mode: TacticMode;
  theme?: string | null;
  /** Override del rating bersaglio (usato dalla Sfida a tempo, difficoltà crescente). */
  targetRating?: number | null;
  /** Id da escludere oltre ai "visti di recente" (puzzle già fatti nella sessione). */
  excludeIds?: string[];
}

/** Seleziona il prossimo puzzle secondo la modalità. Null se non ce ne sono. */
export async function selectNextPuzzle(
  supabase: DB,
  userId: string,
  params: SelectParams,
): Promise<Puzzle | null> {
  if (params.mode === "review") {
    return selectReviewPuzzle(supabase, userId, params.excludeIds ?? []);
  }

  const stats = await ensureStats(supabase, userId);
  const center = params.targetRating ?? stats.rating;
  const theme = params.theme ?? null;
  const seen = new Set<string>([
    ...(params.excludeIds ?? []),
    ...(await recentlySeenIds(supabase, userId)),
  ]);

  // Allarga progressivamente la finestra di rating finché trova candidati.
  for (const width of [120, 250, 500, 1000]) {
    const pool = await fetchPuzzlePool(supabase, center, width, theme);
    const fresh = pool.filter((r) => !seen.has(r.id));
    if (fresh.length) return toPuzzle(pickRandom(fresh));
  }

  // Ultima spiaggia: ignora i "visti" pur di servire qualcosa.
  const pool = await fetchPuzzlePool(supabase, center, 1200, theme);
  return pool.length ? toPuzzle(pickRandom(pool)) : null;
}

async function fetchPuzzlePool(
  supabase: DB,
  center: number,
  width: number,
  theme: string | null,
): Promise<PuzzleRow[]> {
  let q = supabase
    .from("puzzles")
    .select(PUZZLE_COLS)
    .gte("rating", Math.max(400, center - width))
    .lte("rating", center + width)
    .order("popularity", { ascending: false })
    .limit(80);
  if (theme) q = q.contains("themes", [theme]);
  const { data } = await q;
  return (data as PuzzleRow[] | null) ?? [];
}

/** Puzzle in scadenza (SRS) ordinati per scadenza, escludendo quelli passati. */
async function selectReviewPuzzle(
  supabase: DB,
  userId: string,
  excludeIds: string[],
): Promise<Puzzle | null> {
  const nowIso = new Date().toISOString();
  const { data } = await supabase
    .from("user_puzzle_attempts")
    .select("puzzle_id, due_at")
    .eq("user_id", userId)
    .not("due_at", "is", null)
    .lte("due_at", nowIso)
    .order("due_at", { ascending: true })
    .limit(50);

  const exclude = new Set(excludeIds);
  const ids: string[] = [];
  for (const r of data ?? []) {
    const id = r.puzzle_id as string;
    if (!exclude.has(id) && !ids.includes(id)) ids.push(id);
  }

  for (const id of ids) {
    const { data: p } = await supabase
      .from("puzzles")
      .select(PUZZLE_COLS)
      .eq("id", id)
      .maybeSingle<PuzzleRow>();
    if (p) return toPuzzle(p);
  }
  return null;
}

/** Numero di puzzle distinti attualmente in scadenza per il ripasso. */
export async function dueReviewCount(supabase: DB, userId: string): Promise<number> {
  const nowIso = new Date().toISOString();
  const { data } = await supabase
    .from("user_puzzle_attempts")
    .select("puzzle_id")
    .eq("user_id", userId)
    .not("due_at", "is", null)
    .lte("due_at", nowIso)
    .limit(500);
  return new Set((data ?? []).map((r) => r.puzzle_id as string)).size;
}
