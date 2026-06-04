/**
 * Lettura/selezione delle trappole e del progresso SRS. Modulo NON "use server":
 * funzioni pure di accesso al DB, condivise tra Server Component e Server Action.
 * Ricevono un client Supabase già autenticato (la RLS fa rispettare la proprietà
 * dei dati e la visibilità solo dei `published`).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Lesson } from "@/lib/theory/types";
import { activeLocale, pickLocale } from "@/lib/i18n/content";
import type { TrapRow, TrapSummary } from "./types";

type DB = SupabaseClient;

// Si leggono le colonne bilingui (0021/0022) per name/opening_name/body; il
// `body` (italiano) è il fallback quando manca `body_en`.
const SUMMARY_COLS =
  "id,slug,name_it,name_en,category,fame,eco_code,opening_name_it,opening_name_en,side,motif,level";
const FULL_COLS = `${SUMMARY_COLS},trigger_fen,line_pgn,body,body_en,published`;

// Forma grezza dal DB con le colonne localizzate, prima della risoluzione.
type LocalizedNames = {
  name_it: string | null;
  name_en: string | null;
  opening_name_it: string | null;
  opening_name_en: string | null;
};

// Forma grezza completa: nomi localizzati + body bilingue.
type LocalizedFull = Omit<TrapRow, "name" | "opening_name"> &
  LocalizedNames & { body_en: TrapRow["body"] | null };

/** Risolve nomi e body di una riga grezza alla lingua attiva. */
function resolveTrap(row: LocalizedFull, locale: "it" | "en"): TrapRow {
  const { name_it, name_en, opening_name_it, opening_name_en, body_en, ...rest } = row;
  return {
    ...rest,
    name: pickLocale(name_it, name_en, locale) ?? "",
    opening_name: pickLocale(opening_name_it, opening_name_en, locale),
    body: pickLocale(row.body, body_en, locale) ?? row.body,
    motif: row.motif ?? [],
  };
}

/** Tutte le trappole pubblicate (proiezione leggera per il catalogo). */
export async function listTraps(supabase: DB): Promise<TrapSummary[]> {
  const locale = await activeLocale();
  const { data } = await supabase
    .from("traps")
    .select(SUMMARY_COLS)
    .eq("published", true)
    .order("name_it", { ascending: true });
  return ((data as (Omit<TrapSummary, "name" | "opening_name"> & LocalizedNames)[] | null) ?? []).map(
    (t) => {
      const { name_it, name_en, opening_name_it, opening_name_en, ...rest } = t;
      return {
        ...rest,
        // Risolve name/opening_name alla lingua attiva, mantenendo la forma di TrapSummary.
        name: pickLocale(name_it, name_en, locale) ?? "",
        opening_name: pickLocale(opening_name_it, opening_name_en, locale),
        motif: t.motif ?? [],
      };
    },
  );
}

/** Una trappola per slug (con `body` per viewer/allenamento), o null. */
export async function getTrapBySlug(
  supabase: DB,
  slug: string,
): Promise<TrapRow | null> {
  const locale = await activeLocale();
  const { data } = await supabase
    .from("traps")
    .select(FULL_COLS)
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle<LocalizedFull>();
  if (!data) return null;
  return resolveTrap(data, locale);
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
  const locale = await activeLocale();
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

  const rows = ((data as LocalizedFull[] | null) ?? []).map((t) => resolveTrap(t, locale));
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
