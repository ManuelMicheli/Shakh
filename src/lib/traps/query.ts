/**
 * Lettura/selezione delle trappole e del progresso SRS. Modulo NON "use server":
 * funzioni pure di accesso al DB, condivise tra Server Component e Server Action.
 * Ricevono un client Supabase già autenticato (la RLS fa rispettare la proprietà
 * dei dati e la visibilità solo dei `published`).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Lesson } from "@/lib/theory/types";
import type { TrapRow, TrapSummary } from "./types";

type DB = SupabaseClient;

const SUMMARY_COLS =
  "id,slug,name,category,fame,eco_code,opening_name,side,motif,level";
const FULL_COLS = `${SUMMARY_COLS},trigger_fen,line_pgn,body,published`;

/** Tutte le trappole pubblicate (proiezione leggera per il catalogo). */
export async function listTraps(supabase: DB): Promise<TrapSummary[]> {
  const { data } = await supabase
    .from("traps")
    .select(SUMMARY_COLS)
    .eq("published", true)
    .order("name", { ascending: true });
  return ((data as TrapSummary[] | null) ?? []).map((t) => ({
    ...t,
    motif: t.motif ?? [],
  }));
}

/** Una trappola per slug (con `body` per viewer/allenamento), o null. */
export async function getTrapBySlug(
  supabase: DB,
  slug: string,
): Promise<TrapRow | null> {
  const { data } = await supabase
    .from("traps")
    .select(FULL_COLS)
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle<TrapRow>();
  if (!data) return null;
  return { ...data, motif: data.motif ?? [] };
}

/** Quante trappole sono in scadenza (SRS) per l'utente. */
export async function countDueTraps(supabase: DB, userId: string): Promise<number> {
  const { count } = await supabase
    .from("user_trap_progress")
    .select("trap_id", { count: "exact", head: true })
    .eq("user_id", userId)
    .not("due_at", "is", null)
    .lte("due_at", new Date().toISOString());
  return count ?? 0;
}

/** Le trappole in scadenza (complete di `body`), per la sessione di ripasso. */
export async function listDueTraps(supabase: DB, userId: string): Promise<TrapRow[]> {
  const { data: due } = await supabase
    .from("user_trap_progress")
    .select("trap_id, due_at")
    .eq("user_id", userId)
    .not("due_at", "is", null)
    .lte("due_at", new Date().toISOString())
    .order("due_at", { ascending: true });

  const ids = ((due as { trap_id: string }[] | null) ?? []).map((d) => d.trap_id);
  if (ids.length === 0) return [];

  const { data } = await supabase
    .from("traps")
    .select(FULL_COLS)
    .eq("published", true)
    .in("id", ids);

  const rows = ((data as TrapRow[] | null) ?? []).map((t) => ({
    ...t,
    motif: t.motif ?? [],
  }));
  // Rispetta l'ordine di scadenza.
  const order = new Map(ids.map((id, i) => [id, i]));
  rows.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  return rows;
}

/** Type guard: il body letto dal DB ha la forma attesa di una `Lesson`. */
export function bodyAsLesson(body: unknown): Lesson | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (typeof b.tree !== "object" || b.tree === null || !Array.isArray(b.steps)) {
    return null;
  }
  return body as Lesson;
}
