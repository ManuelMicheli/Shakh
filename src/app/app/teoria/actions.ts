"use server";

import { createClient } from "@/lib/supabase/server";

export interface ProgressResult {
  ok: boolean;
  score?: number;
  error?: string;
}

/**
 * Aggiorna un progresso granulare in `user_progress` per una singola chiave:
 * +1 ai tentativi, +1 ai successi se riuscito, e ricalcola lo `score` (0..1) con
 * smoothing di Laplace (parte da 0.5 a freddo, converge a successi/tentativi).
 * Stessa logica dei temi tattici del 05, riusata per finali e mediogioco.
 */
async function bumpProgress(
  dimension: "endgame" | "middlegame_theme",
  key: string,
  success: boolean,
): Promise<ProgressResult> {
  const k = key.trim();
  if (!k) return { ok: false, error: "Chiave di progresso mancante." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessione scaduta. Accedi di nuovo." };

  const { data: existing } = await supabase
    .from("user_progress")
    .select("attempts, successes")
    .eq("user_id", user.id)
    .eq("dimension", dimension)
    .eq("key", k)
    .maybeSingle<{ attempts: number; successes: number }>();

  const attempts = (existing?.attempts ?? 0) + 1;
  const successes = (existing?.successes ?? 0) + (success ? 1 : 0);
  const score = (successes + 1) / (attempts + 2);

  const { error } = await supabase.from("user_progress").upsert(
    {
      user_id: user.id,
      dimension,
      key: k,
      attempts,
      successes,
      score,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "user_id,dimension,key" },
  );
  if (error) return { ok: false, error: error.message };

  return { ok: true, score };
}

/** Registra l'esito di una pratica di finale (dimensione `endgame`). */
export async function recordEndgameResult(
  progressKey: string,
  success: boolean,
): Promise<ProgressResult> {
  return bumpProgress("endgame", progressKey, success);
}

/** Registra un tentativo di esercizio posizionale (dimensione `middlegame_theme`). */
export async function recordMiddlegameAttempt(
  progressKey: string,
  reasonable: boolean,
): Promise<ProgressResult> {
  return bumpProgress("middlegame_theme", progressKey, reasonable);
}
