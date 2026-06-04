"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { ensureStats, selectNextPuzzle, type SelectParams } from "@/lib/tactics/query";
import { applyTacticOutcome } from "@/lib/rating/store";
import { lichessPuzzleToOtb } from "@/lib/rating/calibration";
import { scheduleNext, type SrsState } from "@/lib/tactics/srs";
import type { AttemptInput, Puzzle, TacticStats } from "@/lib/tactics/types";

const MS_PER_DAY = 86_400_000;

/** Serve il prossimo puzzle secondo la modalità (chiamata dal trainer client). */
export async function getNextPuzzle(params: SelectParams): Promise<Puzzle | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return selectNextPuzzle(supabase, user.id, params);
}

export interface RecordResult {
  ok: boolean;
  stats?: TacticStats;
  error?: string;
}

/**
 * Registra un tentativo: scrive `user_puzzle_attempts` (con stato SRS),
 * aggiorna il rating/streak in `user_tactic_stats` e i progressi granulari
 * per ogni tema in `user_progress`.
 */
export async function recordAttempt(input: AttemptInput): Promise<RecordResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const t = await getTranslations("tactics");
    return { ok: false, error: t("sessionExpired") };
  }

  const nowMs = Date.now();
  const won = input.clean;
  // Successo "pieno" = pulito e senza aiuto: conta per progressi e streak.
  const fullSuccess = input.clean && !input.hinted;

  // --- Stato SRS precedente del puzzle (ultimo tentativo) ---
  const { data: last } = await supabase
    .from("user_puzzle_attempts")
    .select("ease, interval_days")
    .eq("user_id", user.id)
    .eq("puzzle_id", input.puzzleId)
    .order("attempted_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ ease: number | null; interval_days: number | null }>();

  const hadPrev = Boolean(last);
  const prevSrs: SrsState | null = last
    ? { ease: last.ease ?? 2.5, intervalDays: last.interval_days ?? 0 }
    : null;

  // I puzzle risolti puliti al primo colpo (e non già in SRS) NON entrano in SRS.
  const shouldSchedule = !input.clean || input.fromReview || hadPrev;
  let ease: number | null = null;
  let intervalDays: number | null = null;
  let dueAt: string | null = null;
  if (shouldSchedule) {
    const s = scheduleNext(prevSrs, input.clean);
    ease = s.ease;
    intervalDays = s.intervalDays;
    dueAt = new Date(nowMs + s.dueInDays * MS_PER_DAY).toISOString();
  }

  // --- Registra il tentativo ---
  const { error: insErr } = await supabase.from("user_puzzle_attempts").insert({
    user_id: user.id,
    puzzle_id: input.puzzleId,
    success: input.clean,
    time_ms: Math.round(input.timeMs),
    ease,
    interval_days: intervalDays,
    due_at: dueAt,
  });
  if (insErr) return { ok: false, error: insErr.message };

  // --- Rating (motore Glicko-2 OTB) / streak ---
  const stats = await ensureStats(supabase, user.id);
  // Il motore possiede rating + rating_deviation: aggiorna `user_ratings`,
  // ricalcola tetto e complessivo, e rispecchia il sotto-rating tattico in
  // `user_tactic_stats` (preservando lo storico via trg_log_tactic_rating).
  let rating = stats.rating;
  let rd = stats.ratingDeviation;
  if (!input.hinted) {
    const opponentOtb = lichessPuzzleToOtb(input.puzzleRating);
    const next = await applyTacticOutcome(supabase, user.id, opponentOtb, won ? 1 : 0);
    rating = Math.round(next.rating);
    rd = Math.round(next.rd);
  }
  const current = fullSuccess ? stats.currentStreak + 1 : 0;
  const best = Math.max(stats.bestStreak, current);
  const newStats: TacticStats = {
    rating,
    ratingDeviation: rd,
    puzzlesSolved: stats.puzzlesSolved + (won ? 1 : 0),
    puzzlesFailed: stats.puzzlesFailed + (won ? 0 : 1),
    currentStreak: current,
    bestStreak: best,
  };

  // Solo i campi NON di rating: rating/rating_deviation sono già scritti dal motore.
  const { error: upErr } = await supabase
    .from("user_tactic_stats")
    .update({
      puzzles_solved: newStats.puzzlesSolved,
      puzzles_failed: newStats.puzzlesFailed,
      current_streak: newStats.currentStreak,
      best_streak: newStats.bestStreak,
    })
    .eq("user_id", user.id);
  if (upErr) return { ok: false, error: upErr.message };

  // --- Progressi granulari per tema (dimensione tactic_theme) ---
  await updateThemeProgress(supabase, user.id, input.themes, fullSuccess);

  revalidatePath("/app/tattiche");
  return { ok: true, stats: newStats };
}

/**
 * Per ogni tema del puzzle: +1 ai tentativi, +1 ai successi se risolto pulito,
 * e ricalcola lo `score` (competenza 0..1) con smoothing di Laplace.
 */
async function updateThemeProgress(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  themes: string[],
  success: boolean,
): Promise<void> {
  const keys = Array.from(new Set(themes.filter(Boolean)));
  if (keys.length === 0) return;

  const { data: existing } = await supabase
    .from("user_progress")
    .select("key, attempts, successes")
    .eq("user_id", userId)
    .eq("dimension", "tactic_theme")
    .in("key", keys);

  const byKey = new Map<string, { attempts: number; successes: number }>();
  for (const r of existing ?? []) {
    byKey.set(r.key as string, {
      attempts: r.attempts as number,
      successes: r.successes as number,
    });
  }

  const nowIso = new Date().toISOString();
  const rows = keys.map((key) => {
    const cur = byKey.get(key);
    const attempts = (cur?.attempts ?? 0) + 1;
    const successes = (cur?.successes ?? 0) + (success ? 1 : 0);
    // Laplace: parte da 0.5 a freddo, converge a successes/attempts.
    const score = (successes + 1) / (attempts + 2);
    return {
      user_id: userId,
      dimension: "tactic_theme",
      key,
      attempts,
      successes,
      score,
      last_seen_at: nowIso,
    };
  });

  await supabase.from("user_progress").upsert(rows, {
    onConflict: "user_id,dimension,key",
  });
}
