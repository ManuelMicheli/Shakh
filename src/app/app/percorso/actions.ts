"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { recomputePath } from "@/lib/path/recompute";

export interface RecomputeResult {
  ok: boolean;
  error?: string;
  currentLevel?: number;
}

/**
 * Ricalcola lo stato del percorso dell'utente leggendo i progressi dei moduli.
 * Idempotente: chiamabile a piacere (bottone "aggiorna", dopo un'attività).
 */
export async function recomputePathAction(): Promise<RecomputeResult> {
  const supabase = await createClient();
  const t = await getTranslations("study");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: t("error.sessionExpiredSignIn") };

  const { currentLevel } = await recomputePath(supabase, user.id);
  revalidatePath("/app/percorso");
  revalidatePath("/app");
  return { ok: true, currentLevel };
}
