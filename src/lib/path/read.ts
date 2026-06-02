/**
 * Letture leggere del percorso (senza ricalcolo né scritture).
 * Usate dal widget "prossimo passo" in home, dove non serve ricomputare.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { loadNodes } from "./recompute";
import type { PathNodeStatus, PathNodeView } from "./types";
import type { WeakSpot } from "./recommend";

type DB = SupabaseClient;

/** Nodi + stato già persistito in `user_path_progress` (default 'locked'). */
export async function loadPathViews(supabase: DB, userId: string): Promise<PathNodeView[]> {
  const nodes = await loadNodes(supabase);
  const { data: rows } = await supabase
    .from("user_path_progress")
    .select("node_id, status, progress")
    .eq("user_id", userId);
  const byId = new Map<string, { status: PathNodeStatus; progress: number }>();
  for (const r of rows ?? [])
    byId.set(r.node_id as string, { status: r.status, progress: r.progress });

  return nodes.map((n) => {
    const s = byId.get(n.id);
    return { ...n, status: s?.status ?? "locked", progress: s?.progress ?? 0 };
  });
}

/** Punto più debole misurato (score minimo con almeno un tentativo). */
export async function loadWeakest(supabase: DB, userId: string): Promise<WeakSpot | null> {
  const { data } = await supabase
    .from("user_progress")
    .select("dimension, key, score, attempts")
    .eq("user_id", userId)
    .gt("attempts", 0)
    .order("score", { ascending: true })
    .limit(1)
    .maybeSingle<WeakSpot>();
  return data ?? null;
}
