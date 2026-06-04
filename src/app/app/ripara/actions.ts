"use server";

import { createClient } from "@/lib/supabase/server";
import { ensureStats } from "@/lib/tactics/query";
import { otbToLichessPuzzle } from "@/lib/rating/calibration";
import { decodeEval, toMoverCp } from "@/lib/analysis/evalScore";
import { moverFromPly } from "@/lib/ai/format";
import { classifyMotif, motifThemes, motifLabel, type MotifClass } from "@/lib/repair/motif";
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
const FLOW_OFFSET = 150;

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

export interface RepairData {
  ok: boolean;
  error?: string;
  motif?: MotifClass;
  motifLabel?: string;
  puzzles?: Puzzle[];
}

/**
 * Genera una mini-lezione di 3 puzzle mirati a un errore specifico di partita.
 * Inferisce il motivo dall'analisi della mossa e pesca puzzle dei temi affini,
 * calibrati (zona di flusso) sul livello dell'utente.
 */
export async function getRepairPuzzles(gameId: string, ply: number): Promise<RepairData> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Session expired. Please sign in again." };

  // Riga d'analisi dell'errore (RLS: solo partite dell'utente).
  const { data: row } = await supabase
    .from("game_analysis")
    .select("ply, eval_before, eval_after, best_move_san, classification")
    .eq("game_id", gameId)
    .eq("ply", ply)
    .maybeSingle<{
      ply: number;
      eval_before: number | null;
      eval_after: number | null;
      best_move_san: string | null;
      classification: string | null;
    }>();
  if (!row) return { ok: false, error: "Move not found." };

  const { data: game } = await supabase
    .from("games")
    .select("user_color")
    .eq("id", gameId)
    .maybeSingle<{ user_color: "white" | "black" | null }>();
  const userColor = game?.user_color ?? (moverFromPly(ply) === "white" ? "white" : "black");
  const userIsWhite = userColor === "white";

  // Inferenza del motivo.
  let mateForUser = false;
  let cpLoss = 0;
  if (row.eval_before != null) {
    const before = decodeEval(row.eval_before);
    if (before.type === "mate") mateForUser = before.value > 0 === userIsWhite;
    if (row.eval_after != null) {
      const cb = toMoverCp(before, userIsWhite);
      const ca = toMoverCp(decodeEval(row.eval_after), userIsWhite);
      cpLoss = Math.max(0, cb - ca);
    }
  }
  const motif = classifyMotif({ mateForUser, bestSan: row.best_move_san, cpLoss });
  const themes = motifThemes(motif);

  // Selezione: finestra di rating attorno al livello (meno l'offset di flusso).
  const stats = await ensureStats(supabase, user.id);
  const center = otbToLichessPuzzle(stats.rating - FLOW_OFFSET);

  for (const width of [350, 650, 1100]) {
    const { data } = await supabase
      .from("puzzles")
      .select(PUZZLE_COLS)
      .gte("rating", Math.max(400, center - width))
      .lte("rating", center + width)
      .overlaps("themes", themes)
      .order("popularity", { ascending: false })
      .limit(60);
    const pool = (data as PuzzleRow[] | null) ?? [];
    if (pool.length >= 3) {
      const picked = shuffle(pool).slice(0, 3).map(toPuzzle);
      return { ok: true, motif, motifLabel: motifLabel(motif), puzzles: picked };
    }
  }

  // Fallback: ignora i temi, pesca per sola difficoltà.
  const { data: fbData } = await supabase
    .from("puzzles")
    .select(PUZZLE_COLS)
    .gte("rating", Math.max(400, center - 1100))
    .lte("rating", center + 1100)
    .order("popularity", { ascending: false })
    .limit(60);
  const pool = (fbData as PuzzleRow[] | null) ?? [];
  if (pool.length === 0) return { ok: false, error: "No puzzles available." };
  return {
    ok: true,
    motif,
    motifLabel: motifLabel(motif),
    puzzles: shuffle(pool).slice(0, 3).map(toPuzzle),
  };
}

/** Mescola una copia dell'array (Fisher–Yates). */
function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
