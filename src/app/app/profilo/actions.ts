"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isLocale, LOCALE_COOKIE } from "@/i18n/config";

export interface UpdateProfileInput {
  displayName: string;
  username: string;
  locale: string;
  themePreference: "dark" | "light";
}

export interface UpdateResult {
  ok: boolean;
  error?: string;
}

/** Aggiorna le impostazioni del profilo (nome, username, locale, tema preferito). */
export async function updateProfile(input: UpdateProfileInput): Promise<UpdateResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessione scaduta. Accedi di nuovo." };

  const username = input.username.trim();
  const displayName = input.displayName.trim();
  if (username && !/^[a-zA-Z0-9_]{3,30}$/.test(username))
    return { ok: false, error: "Username: 3–30 caratteri, lettere/numeri/underscore." };

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName || null,
      username: username || null,
      locale: input.locale,
      theme_preference: input.themePreference,
    })
    .eq("id", user.id);

  if (error) {
    if (error.code === "23505") return { ok: false, error: "Username già in uso." };
    return { ok: false, error: error.message };
  }

  // Allinea il cookie di locale così UI e formati seguono la scelta (§3).
  if (isLocale(input.locale)) {
    (await cookies()).set(LOCALE_COOKIE, input.locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }

  revalidatePath("/app/profilo");
  return { ok: true };
}

/** Tabelle con dati personali esportabili (colonna chiave → valore user.id). */
const EXPORT_TABLES: { table: string; col: string }[] = [
  { table: "games", col: "user_id" },
  { table: "user_progress", col: "user_id" },
  { table: "user_puzzle_attempts", col: "user_id" },
  { table: "user_tactic_stats", col: "user_id" },
  { table: "tactic_rating_history", col: "user_id" },
  { table: "user_path_progress", col: "user_id" },
  { table: "content_completions", col: "user_id" },
  { table: "repertoires", col: "owner_user_id" },
];

export interface ExportResult {
  ok: boolean;
  error?: string;
  data?: Record<string, unknown>;
}

/**
 * Diritto di portabilità (§1): raccoglie i dati dell'utente in un oggetto JSON.
 * RLS garantisce che si leggano solo le proprie righe; le tabelle non presenti
 * vengono semplicemente ignorate.
 */
export async function exportMyData(): Promise<ExportResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessione scaduta. Accedi di nuovo." };

  const out: Record<string, unknown> = {
    exported_at: new Date().toISOString(),
    account: { id: user.id, email: user.email },
  };

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  out.profile = profile ?? null;

  for (const { table, col } of EXPORT_TABLES) {
    const { data, error } = await supabase.from(table).select("*").eq(col, user.id);
    if (!error) out[table] = data ?? [];
  }

  return { ok: true, data: out };
}

export interface DeleteResult {
  ok: boolean;
  error?: string;
}

/**
 * Diritto all'oblio (§1): elimina l'utente da auth.users tramite service role.
 * Le FK `on delete cascade` rimuovono a cascata profilo e dati collegati.
 * Richiede conferma esplicita lato client.
 */
export async function deleteMyAccount(): Promise<DeleteResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessione scaduta. Accedi di nuovo." };

  try {
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) return { ok: false, error: error.message };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Errore." };
  }

  // Chiude la sessione locale (i cookie vengono invalidati).
  await supabase.auth.signOut();
  return { ok: true };
}
