"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { loadUserMetrics } from "@/lib/ai/userMetrics";
import { synthesizePatterns } from "@/lib/ai/coach";
import { isCoachConfigured } from "@/lib/ai/client";
import type { CoachSynthesis, UserMetrics } from "@/lib/ai/types";

export interface SynthesisResult {
  ok: boolean;
  error?: string;
  synthesis?: CoachSynthesis;
}

/**
 * Funzione C — aggiorna i progressi (metriche deterministiche su `user_progress`)
 * e produce la sintesi AI dei pattern d'errore in JSON. L'aggiornamento dei
 * progressi avviene sempre; la sintesi solo se il coach è configurato.
 */
export async function refreshProgressAndSynthesize(): Promise<SynthesisResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Session expired. Sign in again." };

  const metrics = await loadUserMetrics(supabase, user.id);
  await upsertProgress(supabase, user.id, metrics);
  revalidatePath("/app/coach");

  if (metrics.userMoves === 0)
    return { ok: false, error: "Analyze a few games first: there's no data yet." };
  if (!isCoachConfigured())
    return { ok: false, error: "The AI coach isn't configured (ANTHROPIC_API_KEY is missing)." };

  try {
    const synthesis = await synthesizePatterns(metrics);
    if (!synthesis)
      return { ok: false, error: "Coach response couldn't be parsed. Try again." };
    // Cache dell'ultima sintesi: la dashboard (08) la mostra senza rigenerarla.
    await supabase.from("coach_synthesis").upsert(
      {
        user_id: user.id,
        summary: synthesis.summary,
        focus_areas: synthesis.focusAreas,
        suggestion: synthesis.suggestion,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    revalidatePath("/app");
    return { ok: true, synthesis };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "AI coach error." };
  }
}

/** Scrive una riga `user_progress` per fase (dimension='phase'), score 0..1. */
async function upsertProgress(
  supabase: SupabaseClient,
  userId: string,
  metrics: UserMetrics,
): Promise<void> {
  const now = new Date().toISOString();
  const rows = metrics.byPhase
    .filter((p) => p.moves > 0)
    .map((p) => {
      const errors = p.inaccuracies + p.mistakes + p.blunders;
      return {
        user_id: userId,
        dimension: "phase",
        key: p.phase,
        attempts: p.moves,
        successes: p.moves - errors,
        score: p.score,
        last_seen_at: now,
      };
    });
  if (rows.length === 0) return;
  await supabase.from("user_progress").upsert(rows, { onConflict: "user_id,dimension,key" });
}
