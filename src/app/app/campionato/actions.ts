"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { loadOverallRating } from "@/lib/rating/store";
import { GLICKO_ANCHOR } from "@/lib/rating/glicko2";
import { divisionForRating } from "@/lib/lega/divisions";

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

/**
 * Iscrive l'utente al Campionato della stagione attiva, nel girone della sua
 * divisione Lega (derivata dal Rating Shakh). Idempotente lato DB.
 */
export async function enrollChampionship(): Promise<
  ActionResult<{ groupId: string }>
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Accedi per iscriverti." };

  const overall = await loadOverallRating(supabase, user.id);
  const rating = overall?.rating ?? GLICKO_ANCHOR;
  const division = divisionForRating(rating);

  const { data, error } = await supabase.rpc("champ_enroll", {
    p_division: division.key,
    p_seed_rating: Math.round(rating),
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/app/campionato");
  return { ok: true, data: { groupId: data as string } };
}

/**
 * Coda dedicata: prova ad accoppiarti con un compagno di girone non ancora
 * affrontato. Ritorna `{ gameId }` se accoppiato, `null` se in attesa.
 */
export async function enqueueChampionship(): Promise<
  ActionResult<{ gameId: string | null }>
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Accedi per giocare." };

  const { data, error } = await supabase.rpc("champ_enqueue");
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: { gameId: (data as string | null) ?? null } };
}

/** Esci dalla coda del Campionato. */
export async function cancelChampionship(): Promise<ActionResult<null>> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("champ_cancel");
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: null };
}
