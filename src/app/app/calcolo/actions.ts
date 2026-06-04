"use server";

import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { ensureStats } from "@/lib/tactics/query";
import { otbToLichessPuzzle, lichessPuzzleToOtb } from "@/lib/rating/calibration";
import { recordDomainOutcomes } from "@/lib/rating/store";
import { CALC_OPP_RD, CALC_DEPTH_BONUS } from "@/lib/rating/aggregate";
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

/** Numero di mosse dell'utente nella soluzione (la 1ª mossa è l'innesco avversario). */
function userMovesOf(moves: string[]): number {
  return Math.floor(moves.length / 2);
}

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

export interface CalcSelectParams {
  /** Profondità desiderata (numero di mosse dell'utente da calcolare). */
  targetDepth: number;
  excludeIds: string[];
}

/**
 * Seleziona un puzzle per l'allenamento del calcolo: finestra di rating attorno
 * al livello dell'utente, filtrato per PROFONDITÀ della linea (mosse dell'utente).
 */
export async function getCalcPuzzle(params: CalcSelectParams): Promise<Puzzle | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const stats = await ensureStats(supabase, user.id);
  const center = otbToLichessPuzzle(stats.rating);
  const seen = new Set(params.excludeIds);
  const depth = Math.max(2, params.targetDepth);

  for (const width of [350, 600, 1000]) {
    const { data } = await supabase
      .from("puzzles")
      .select(PUZZLE_COLS)
      .gte("rating", Math.max(400, center - width))
      .lte("rating", center + width)
      .order("popularity", { ascending: false })
      .limit(150);
    const pool = (data as PuzzleRow[] | null) ?? [];
    const matching = pool
      .map(toPuzzle)
      .filter((p) => !seen.has(p.id))
      .filter((p) => {
        const um = userMovesOf(p.moves);
        return um >= depth && um <= depth + 1;
      });
    if (matching.length) {
      return matching[Math.floor(Math.random() * matching.length)];
    }
  }
  return null;
}

export interface CalcResultInput {
  puzzleId: string;
  puzzleRating: number;
  userMoves: number;
  solved: boolean;
}

export interface CalcResult {
  ok: boolean;
  error?: string;
}

/** Registra l'esito di una prova di calcolo nel dominio di rating `calculation`. */
export async function recordCalcResult(input: CalcResultInput): Promise<CalcResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const t = await getTranslations("tactics");
    return { ok: false, error: t("sessionExpired") };
  }

  // Difficoltà = forza OTB del puzzle + bonus per la profondità calcolata.
  const opponentRating =
    lichessPuzzleToOtb(input.puzzleRating) + Math.max(0, input.userMoves - 2) * CALC_DEPTH_BONUS;

  try {
    await recordDomainOutcomes(
      supabase,
      user.id,
      "calculation",
      [{ opponentRating, opponentRd: CALC_OPP_RD, score: input.solved ? 1 : 0 }],
      "calculation",
    );
  } catch {
    const t = await getTranslations("tactics");
    return { ok: false, error: t("ratingNotUpdatedError") };
  }
  return { ok: true };
}
