"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { recomputePath } from "@/lib/path/recompute";
import { recordDomainOutcomes } from "@/lib/rating/store";
import { endgameDifficulty, ENDGAME_OPP_RD } from "@/lib/rating/aggregate";

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
  const t = await getTranslations("theory");
  const k = key.trim();
  if (!k) return { ok: false, error: t("errors.missingProgressKey") };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: t("errors.sessionExpired") };

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

/** Registra l'esito di una pratica di finale (dimensione `endgame`) + segnale di rating. */
export async function recordEndgameResult(
  progressKey: string,
  success: boolean,
): Promise<ProgressResult> {
  const result = await bumpProgress("endgame", progressKey, success);
  if (result.ok) {
    // Segnale di rating (dominio 'endgame'): converti = batti la difficoltà OTB.
    // Best-effort: non deve mai far fallire la registrazione del progresso.
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await recordDomainOutcomes(
          supabase,
          user.id,
          "endgame",
          [
            {
              opponentRating: endgameDifficulty(progressKey),
              opponentRd: ENDGAME_OPP_RD,
              score: success ? 1 : 0,
            },
          ],
          "endgame",
        );
      }
    } catch {
      /* ignora: il progresso è già salvato */
    }
  }
  return result;
}

/** Registra un tentativo di esercizio posizionale (dimensione `middlegame_theme`). */
export async function recordMiddlegameAttempt(
  progressKey: string,
  reasonable: boolean,
): Promise<ProgressResult> {
  return bumpProgress("middlegame_theme", progressKey, reasonable);
}

/**
 * Segna una lezione come completata (tabella `content_completions`): aggancio
 * del percorso guidato (prompt 07) al LessonViewer (06a). Idempotente — la PK
 * impedisce duplicati — e ricalcola subito lo stato del percorso.
 */
export async function recordLessonCompletion(
  contentItemId: string,
): Promise<{ ok: boolean; error?: string }> {
  const t = await getTranslations("theory");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: t("errors.sessionExpired") };

  const { error } = await supabase
    .from("content_completions")
    .upsert(
      { user_id: user.id, content_item_id: contentItemId },
      { onConflict: "user_id,content_item_id" },
    );
  if (error) return { ok: false, error: error.message };

  await recomputePath(supabase, user.id);
  revalidatePath("/app/percorso");
  revalidatePath("/app");
  return { ok: true };
}
