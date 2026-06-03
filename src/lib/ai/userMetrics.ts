import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { computeMetrics, type MetricGame, type MetricRow } from "./metrics";
import type { UserMetrics } from "./types";

/**
 * Carica le partite analizzate dell'utente e le relative righe d'analisi, poi
 * calcola le metriche deterministiche dei pattern d'errore (nessuna AI). La RLS
 * limita già le query ai dati dell'utente.
 */
export async function loadUserMetrics(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserMetrics> {
  const { data: games } = await supabase
    .from("games")
    .select("id, user_color")
    .eq("user_id", userId)
    .eq("analyzed", true)
    .eq("counts_for_profile", true); // solo partite del proprio account verificato

  const gameList = (games ?? []) as MetricGame[];
  if (gameList.length === 0) return computeMetrics([], []);

  const ids = gameList.map((g) => g.id);
  const { data: rows } = await supabase
    .from("game_analysis")
    .select("game_id, ply, fen, classification")
    .in("game_id", ids);

  return computeMetrics(gameList, (rows ?? []) as MetricRow[]);
}
