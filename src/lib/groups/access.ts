/**
 * Controlli di accesso del layer istruttore (prompt 09 §1).
 *
 * Sola lettura: legge il ruolo dell'utente in un gruppo. La RLS resta la
 * difesa primaria su ogni dato di terzi; questi helper servono per gating
 * lato server (mostrare/redirigere) e non sostituiscono mai la RLS.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { GroupRole } from "./types";

type DB = SupabaseClient;

/** Ruolo dell'utente nel gruppo, o null se non ne fa parte. */
export async function getMyGroupRole(
  supabase: DB,
  groupId: string,
  userId: string,
): Promise<GroupRole | null> {
  const { data } = await supabase
    .from("group_members")
    .select("role_in_group")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .maybeSingle<{ role_in_group: GroupRole }>();
  return data?.role_in_group ?? null;
}

/** True se l'utente è istruttore o owner del gruppo. */
export function isInstructorRole(role: GroupRole | null): boolean {
  return role === "instructor" || role === "owner";
}
