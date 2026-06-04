"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import {
  reconcile,
  slugify,
  type RepertoireMoveRow,
  type PieceColor,
} from "@/lib/theory/repertoire";
import { deserializeTree, type SerializedMoveTree } from "@/lib/chess/moveTree";
import { scheduleNext, type SrsState } from "@/lib/tactics/srs";

const MS_PER_DAY = 86_400_000;

export interface ActionResult<T = undefined> {
  ok: boolean;
  data?: T;
  error?: string;
}

/** Crea un repertorio per l'utente corrente. */
export async function createRepertoire(
  name: string,
  color: PieceColor,
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient();
  const t = await getTranslations("study");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: t("error.sessionExpiredSignIn") };

  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: t("error.repertoireName") };

  const { data, error } = await supabase
    .from("repertoires")
    .insert({ owner_user_id: user.id, name: trimmed, color })
    .select("id")
    .single<{ id: string }>();
  if (error) return { ok: false, error: error.message };

  revalidatePath("/app/repertorio");
  return { ok: true, data: { id: data.id } };
}

export async function deleteRepertoire(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("repertoires").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/app/repertorio");
  return { ok: true };
}

/**
 * Salva l'albero del repertorio su `repertoire_moves`, riusando gli id esistenti
 * (per non perdere lo stato SRS) ed eliminando le righe non più presenti.
 */
export async function saveRepertoire(
  repertoireId: string,
  tree: SerializedMoveTree,
): Promise<ActionResult> {
  const supabase = await createClient();
  const t = await getTranslations("study");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: t("error.sessionExpiredSignIn") };

  // La RLS garantisce la proprietà; verifichiamo l'esistenza per un errore chiaro.
  const { data: rep } = await supabase
    .from("repertoires")
    .select("id")
    .eq("id", repertoireId)
    .maybeSingle<{ id: string }>();
  if (!rep) return { ok: false, error: t("error.repertoireNotFound") };

  let parsed;
  try {
    parsed = deserializeTree(tree);
  } catch {
    return { ok: false, error: t("error.invalidTree") };
  }

  const { data: existingRows, error: loadErr } = await supabase
    .from("repertoire_moves")
    .select("id, parent_move_id, ply, san, fen, annotation, eval, order_index")
    .eq("repertoire_id", repertoireId);
  if (loadErr) return { ok: false, error: loadErr.message };

  const { rows, deleteIds } = reconcile(
    parsed,
    repertoireId,
    (existingRows as RepertoireMoveRow[] | null) ?? [],
    randomUUID,
  );

  if (deleteIds.length > 0) {
    const { error } = await supabase.from("repertoire_moves").delete().in("id", deleteIds);
    if (error) return { ok: false, error: error.message };
  }
  if (rows.length > 0) {
    // L'ordine genitore→figlio (BFS) soddisfa la FK parent_move_id nell'upsert.
    const { error } = await supabase.from("repertoire_moves").upsert(rows, { onConflict: "id" });
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath(`/app/repertorio/${repertoireId}`);
  return { ok: true };
}

/**
 * Registra un tentativo del trainer su un item (nodo-utente) del repertorio:
 * SRS in `repertoire_training` + progresso granulare in `user_progress` (opening).
 */
export async function recordRepertoireAttempt(
  repertoireId: string,
  repertoireMoveId: string,
  success: boolean,
): Promise<ActionResult> {
  const supabase = await createClient();
  const t = await getTranslations("study");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: t("error.sessionExpired") };

  const nowMs = Date.now();

  // --- SRS sull'item ---
  const { data: prev } = await supabase
    .from("repertoire_training")
    .select("ease, interval_days, attempts, successes")
    .eq("user_id", user.id)
    .eq("repertoire_move_id", repertoireMoveId)
    .maybeSingle<{ ease: number; interval_days: number; attempts: number; successes: number }>();

  const prevSrs: SrsState | null = prev
    ? { ease: prev.ease ?? 2.5, intervalDays: prev.interval_days ?? 0 }
    : null;
  const s = scheduleNext(prevSrs, success);

  const { error: tErr } = await supabase.from("repertoire_training").upsert(
    {
      user_id: user.id,
      repertoire_move_id: repertoireMoveId,
      attempts: (prev?.attempts ?? 0) + 1,
      successes: (prev?.successes ?? 0) + (success ? 1 : 0),
      ease: s.ease,
      interval_days: s.intervalDays,
      due_at: new Date(nowMs + s.dueInDays * MS_PER_DAY).toISOString(),
      last_seen_at: new Date(nowMs).toISOString(),
    },
    { onConflict: "user_id,repertoire_move_id" },
  );
  if (tErr) return { ok: false, error: tErr.message };

  // --- Progresso granulare (dimensione opening, key = slug del repertorio) ---
  const { data: rep } = await supabase
    .from("repertoires")
    .select("name")
    .eq("id", repertoireId)
    .maybeSingle<{ name: string }>();
  const key = rep ? slugify(rep.name) : `rep_${repertoireId.slice(0, 8)}`;

  const { data: cur } = await supabase
    .from("user_progress")
    .select("attempts, successes")
    .eq("user_id", user.id)
    .eq("dimension", "opening")
    .eq("key", key)
    .maybeSingle<{ attempts: number; successes: number }>();

  const attempts = (cur?.attempts ?? 0) + 1;
  const successes = (cur?.successes ?? 0) + (success ? 1 : 0);
  await supabase.from("user_progress").upsert(
    {
      user_id: user.id,
      dimension: "opening",
      key,
      attempts,
      successes,
      score: (successes + 1) / (attempts + 2), // smoothing di Laplace
      last_seen_at: new Date(nowMs).toISOString(),
    },
    { onConflict: "user_id,dimension,key" },
  );

  return { ok: true };
}
