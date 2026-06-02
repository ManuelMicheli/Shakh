/**
 * Engine dei requisiti del percorso (prompt 07).
 *
 * Dato un nodo e un utente, calcola `progress` (0..1) e se è `completed`,
 * LEGGENDO i dati già esistenti negli altri moduli (05/06/03):
 *  - `user_progress`        → temi tattici, finali, mediogioco, aperture
 *  - `user_tactic_stats`    → rating tattico (05)
 *  - `games.analyzed`       → partite analizzate (03)
 *  - `content_completions`  → lezioni completate (06a, agganciato qui)
 *
 * Modulo NON "use server": funzioni pure di sola lettura, ricevono un client
 * Supabase già autenticato (la RLS fa rispettare la proprietà dei dati).
 * Nessuna duplicazione di progressi: qui si LEGGE soltanto.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Requirement, RequirementResult } from "./types";

type DB = SupabaseClient;

const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));

/** Rating di partenza convenzionale del solver, usato come base di progresso. */
const RATING_BASE = 1000;

/** Legge una riga `user_progress` (attempts/successes/score) per dimensione+chiave. */
async function readProgress(
  supabase: DB,
  userId: string,
  dimension: string,
  key: string,
): Promise<{ attempts: number; successes: number; score: number } | null> {
  const { data } = await supabase
    .from("user_progress")
    .select("attempts, successes, score")
    .eq("user_id", userId)
    .eq("dimension", dimension)
    .eq("key", key)
    .maybeSingle<{ attempts: number; successes: number; score: number }>();
  return data ?? null;
}

/** Valuta un singolo requisito leggendo i dati del modulo competente. */
export async function evaluateRequirement(
  supabase: DB,
  userId: string,
  req: Requirement,
): Promise<RequirementResult> {
  switch (req.type) {
    case "lesson": {
      // Completata se esiste una riga content_completions per quella lezione.
      const { data: item } = await supabase
        .from("content_items")
        .select("id")
        .eq("slug", req.slug)
        .maybeSingle<{ id: string }>();
      if (!item) return { progress: 0, met: false };
      const { data: done } = await supabase
        .from("content_completions")
        .select("content_item_id")
        .eq("user_id", userId)
        .eq("content_item_id", item.id)
        .maybeSingle();
      const met = Boolean(done);
      return { progress: met ? 1 : 0, met };
    }

    case "puzzles_theme": {
      // user_progress(tactic_theme, theme): serve volume (count) E tasso (score).
      const p = await readProgress(supabase, userId, "tactic_theme", req.theme);
      const attempts = p?.attempts ?? 0;
      const rate = p?.score ?? 0;
      const volume = clamp01(attempts / req.count);
      const accuracy = clamp01(rate / req.minSuccessRate);
      const met = attempts >= req.count && rate >= req.minSuccessRate;
      // Progresso = quanto manca su entrambi i fronti (il più indietro pesa di più).
      return { progress: met ? 1 : clamp01((volume + accuracy) / 2), met };
    }

    case "endgame_practice": {
      // Finale convertito con successo almeno una volta (segnale dal 06c).
      const p = await readProgress(supabase, userId, "endgame", req.key);
      const successes = p?.successes ?? 0;
      const attempts = p?.attempts ?? 0;
      const met = successes >= 1;
      const progress = met ? 1 : attempts > 0 ? 0.4 : 0;
      return { progress, met };
    }

    case "middlegame_theme": {
      // user_progress(middlegame_theme, key): esercizio posizionale ragionevole (06c).
      const p = await readProgress(supabase, userId, "middlegame_theme", req.key);
      const attempts = p?.attempts ?? 0;
      const rate = p?.score ?? 0;
      const met = attempts > 0 && rate >= req.minSuccessRate;
      return { progress: met ? 1 : clamp01(rate / req.minSuccessRate), met };
    }

    case "opening_drill": {
      // Drill d'apertura superato: una key specifica o la migliore tra tutte.
      if (req.key) {
        const p = await readProgress(supabase, userId, "opening", req.key);
        const score = p?.score ?? 0;
        const met = (p?.attempts ?? 0) > 0 && score >= req.minAccuracy;
        return { progress: met ? 1 : clamp01(score / req.minAccuracy), met };
      }
      const { data } = await supabase
        .from("user_progress")
        .select("score, attempts")
        .eq("user_id", userId)
        .eq("dimension", "opening")
        .gt("attempts", 0)
        .order("score", { ascending: false })
        .limit(1)
        .maybeSingle<{ score: number }>();
      const best = data?.score ?? 0;
      const met = best >= req.minAccuracy;
      return { progress: met ? 1 : clamp01(best / req.minAccuracy), met };
    }

    case "analyze_games": {
      const { count } = await supabase
        .from("games")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("analyzed", true);
      const n = count ?? 0;
      const met = n >= req.count;
      return { progress: clamp01(n / req.count), met };
    }

    case "tactic_rating": {
      const { data } = await supabase
        .from("user_tactic_stats")
        .select("rating")
        .eq("user_id", userId)
        .maybeSingle<{ rating: number }>();
      const rating = data?.rating ?? RATING_BASE;
      const met = rating >= req.min;
      const span = Math.max(1, req.min - RATING_BASE);
      return { progress: clamp01((rating - RATING_BASE) / span), met };
    }

    default:
      return { progress: 0, met: false };
  }
}

/**
 * Valuta un nodo: media pesata dei requisiti per il `progress`,
 * `completed` se TUTTI i requisiti sono soddisfatti.
 */
export async function evaluateNode(
  supabase: DB,
  userId: string,
  requirements: Requirement[],
): Promise<{ progress: number; completed: boolean }> {
  if (requirements.length === 0) return { progress: 0, completed: false };

  const results = await Promise.all(
    requirements.map((r) => evaluateRequirement(supabase, userId, r)),
  );

  let weightSum = 0;
  let weighted = 0;
  let allMet = true;
  requirements.forEach((r, i) => {
    const w = r.weight ?? 1;
    weightSum += w;
    weighted += results[i].progress * w;
    if (!results[i].met) allMet = false;
  });

  return { progress: weightSum > 0 ? clamp01(weighted / weightSum) : 0, completed: allMet };
}
