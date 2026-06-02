/**
 * Predisposizione del requisito `traps` per l'engine del Percorso (prompt 07,
 * non ancora costruito). Quando il 07 esisterà, basterà collegare questo
 * valutatore al suo switch di requisiti SENZA rifarlo: la firma è già quella di
 * un valutatore di requisito (riceve supabase + userId, restituisce avanzamento).
 *
 * Semantica: "studia N trappole" = N trappole distinte con almeno un successo in
 * `user_trap_progress`, eventualmente filtrate per notorietà (`fame`).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { TrapFame } from "./types";

/** Requisito di percorso: { type: 'traps', count, fame? }. */
export interface TrapsRequirement {
  type: "traps";
  count: number;
  fame?: TrapFame;
}

export interface RequirementProgress {
  met: boolean;
  have: number;
  need: number;
}

/** Valuta un requisito `traps` per l'utente dato (RLS: legge i suoi dati). */
export async function evaluateTrapsRequirement(
  supabase: SupabaseClient,
  userId: string,
  req: TrapsRequirement,
): Promise<RequirementProgress> {
  const need = Math.max(1, req.count);

  // Trappole superate (≥1 successo) dall'utente.
  const { data: prog } = await supabase
    .from("user_trap_progress")
    .select("trap_id, successes")
    .eq("user_id", userId)
    .gt("successes", 0);

  let trapIds = ((prog as { trap_id: string }[] | null) ?? []).map((p) => p.trap_id);

  // Filtro opzionale per notorietà: restringi alle trappole di quella `fame`.
  if (req.fame && trapIds.length > 0) {
    const { data: famed } = await supabase
      .from("traps")
      .select("id")
      .eq("fame", req.fame)
      .in("id", trapIds);
    const allow = new Set(((famed as { id: string }[] | null) ?? []).map((t) => t.id));
    trapIds = trapIds.filter((id) => allow.has(id));
  }

  const have = new Set(trapIds).size;
  return { met: have >= need, have, need };
}
