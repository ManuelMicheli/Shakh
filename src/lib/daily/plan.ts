/**
 * "Allenamento di oggi" (Fase 1): assembla in automatico una sessione breve
 * (~15 min) a partire dai dati già prodotti dagli altri moduli.
 *
 * SOLO LETTURE, stesso pattern di `tactics/query.ts`: riceve un client Supabase
 * già autenticato (la RLS garantisce la proprietà). Non scrive progressi: i
 * blocchi rimandano ai moduli esistenti che già registrano i risultati.
 *
 * Il "fatto oggi" di ogni blocco è derivato dall'attività odierna (nessuna
 * nuova tabella di sessione): è indicativo, serve a dare senso di progresso.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureStats, dueReviewCount } from "@/lib/tactics/query";
import { themeLabel } from "@/lib/tactics/themes";

type DB = SupabaseClient;

export type BlockKind = "review" | "weakness" | "tactics" | "endgame" | "repertoire";

export interface PlanBlock {
  kind: BlockKind;
  title: string;
  detail: string;
  href: string;
  /** Obiettivo numerico del blocco (puzzle, mosse, lezioni). */
  target: number;
  /** Progresso odierno stimato. */
  done: number;
  /** Minuti stimati. */
  estMin: number;
}

export interface DailyPlan {
  blocks: PlanBlock[];
  totalMin: number;
  /** Tutti i blocchi completati. */
  completed: boolean;
  /** Rating tattico (OTB) per l'intestazione. */
  tacticRating: number;
}

/** Inizio della giornata corrente (mezzanotte locale del server). */
function startOfTodayIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

interface AttemptTodayRow {
  success: boolean;
  puzzles: { themes: string[] | null } | null;
}

/** Costruisce il piano del giorno. */
export async function buildDailyPlan(supabase: DB, userId: string): Promise<DailyPlan> {
  const todayIso = startOfTodayIso();

  const [stats, dueReview, weakTheme, attemptsToday, endgame, repertoire] = await Promise.all([
    ensureStats(supabase, userId),
    dueReviewCount(supabase, userId),
    loadWeakestTheme(supabase, userId),
    loadAttemptsToday(supabase, userId, todayIso),
    loadEndgameBlock(supabase, userId, todayIso),
    loadRepertoireDue(supabase, userId, todayIso),
  ]);

  const puzzlesToday = attemptsToday.length;
  const blocks: PlanBlock[] = [];

  // 1) Ripasso SRS (solo se ci sono puzzle in scadenza).
  if (dueReview > 0) {
    const target = Math.min(dueReview, 10);
    blocks.push({
      kind: "review",
      title: "Review",
      detail: `${dueReview} puzzles due for review`,
      href: "/app/tattiche?mode=review",
      target,
      done: Math.min(target, puzzlesToday),
      estMin: 5,
    });
  }

  // 2) Punto debole: tema tattico con competenza più bassa.
  if (weakTheme) {
    const target = 6;
    const themeDone = attemptsToday.filter((a) =>
      (a.puzzles?.themes ?? []).includes(weakTheme.key),
    ).length;
    blocks.push({
      kind: "weakness",
      title: `Weak spot: ${themeLabel(weakTheme.key)}`,
      detail: `Proficiency ${Math.round(weakTheme.score * 100)}% — let's train it`,
      href: `/app/tattiche?mode=theme&theme=${weakTheme.key}`,
      target,
      done: Math.min(target, themeDone),
      estMin: 5,
    });
  }

  // 3) Tattica adattiva (sempre presente: zoccolo della sessione).
  {
    const target = 8;
    blocks.push({
      kind: "tactics",
      title: "Adaptive tactics",
      detail: "Puzzles calibrated to your level (flow zone)",
      href: "/app/tattiche?mode=adaptive",
      target,
      done: Math.min(target, puzzlesToday),
      estMin: 5,
    });
  }

  // 4) Finale teorico (se c'è una lezione adatta).
  if (endgame) {
    blocks.push({
      kind: "endgame",
      title: `Endgame: ${endgame.title}`,
      detail: "Convert the position against perfect defense",
      href: `/app/teoria/${endgame.slug}`,
      target: 1,
      done: endgame.doneToday ? 1 : 0,
      estMin: 5,
    });
  }

  // 5) Repertorio in scadenza (se l'utente ne ha).
  if (repertoire.due > 0) {
    const target = Math.min(repertoire.due, 15);
    blocks.push({
      kind: "repertoire",
      title: "Repertoire review",
      detail: `${repertoire.due} moves due`,
      href: repertoire.href,
      target,
      done: Math.min(target, repertoire.reviewedToday),
      estMin: 4,
    });
  }

  const totalMin = blocks.reduce((s, b) => s + b.estMin, 0);
  const completed = blocks.length > 0 && blocks.every((b) => b.done >= b.target);

  return { blocks, totalMin, completed, tacticRating: stats.rating };
}

// ============================================================
// Loader specifici
// ============================================================

async function loadWeakestTheme(
  supabase: DB,
  userId: string,
): Promise<{ key: string; score: number } | null> {
  const { data } = await supabase
    .from("user_progress")
    .select("key, score, attempts")
    .eq("user_id", userId)
    .eq("dimension", "tactic_theme")
    .gte("attempts", 3)
    .lt("score", 0.7)
    .order("score", { ascending: true })
    .limit(1)
    .maybeSingle<{ key: string; score: number; attempts: number }>();
  return data ? { key: data.key, score: data.score } : null;
}

async function loadAttemptsToday(
  supabase: DB,
  userId: string,
  todayIso: string,
): Promise<AttemptTodayRow[]> {
  const { data } = await supabase
    .from("user_puzzle_attempts")
    .select("success, puzzles(themes)")
    .eq("user_id", userId)
    .gte("attempted_at", todayIso)
    .limit(200);
  return (data as AttemptTodayRow[] | null) ?? [];
}

/** Prima lezione di finale non ancora completata (o la prima in assoluto). */
async function loadEndgameBlock(
  supabase: DB,
  userId: string,
  todayIso: string,
): Promise<{ slug: string; title: string; doneToday: boolean } | null> {
  const { data: lessons } = await supabase
    .from("content_items")
    .select("id, slug, title")
    .eq("type", "endgame")
    .eq("published", true)
    .order("level", { ascending: true })
    .order("order_index", { ascending: true })
    .limit(40);
  const list = (lessons as { id: string; slug: string; title: string }[] | null) ?? [];
  if (list.length === 0) return null;

  const { data: comps } = await supabase
    .from("content_completions")
    .select("content_item_id, completed_at")
    .eq("user_id", userId)
    .in(
      "content_item_id",
      list.map((l) => l.id),
    );
  const completed = new Map(
    ((comps as { content_item_id: string; completed_at: string }[] | null) ?? []).map((c) => [
      c.content_item_id,
      c.completed_at,
    ]),
  );

  const next = list.find((l) => !completed.has(l.id)) ?? list[0];
  const compAt = completed.get(next.id);
  const doneToday = compAt != null && compAt >= todayIso;
  return { slug: next.slug, title: next.title, doneToday };
}

/** Conteggio mosse di repertorio in scadenza + link alla prima sessione di training. */
async function loadRepertoireDue(
  supabase: DB,
  userId: string,
  todayIso: string,
): Promise<{ due: number; reviewedToday: number; href: string }> {
  const nowIso = new Date().toISOString();
  const { data } = await supabase
    .from("repertoire_training")
    .select("repertoire_move_id, due_at, last_seen_at")
    .eq("user_id", userId)
    .not("due_at", "is", null)
    .lte("due_at", nowIso)
    .limit(500);
  const rows =
    (data as { repertoire_move_id: string; due_at: string; last_seen_at: string | null }[] | null) ??
    [];
  const due = rows.length;

  let reviewedToday = 0;
  const { data: seen } = await supabase
    .from("repertoire_training")
    .select("repertoire_move_id")
    .eq("user_id", userId)
    .gte("last_seen_at", todayIso)
    .limit(500);
  reviewedToday = ((seen as unknown[] | null) ?? []).length;

  // Link a un repertorio dell'utente (il primo): la sessione di training pesca
  // automaticamente le mosse in scadenza.
  const { data: rep } = await supabase
    .from("repertoires")
    .select("id")
    .eq("owner_user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<{ id: string }>();
  const href = rep ? `/app/repertorio/${rep.id}/training` : "/app/repertorio";

  return { due, reviewedToday, href };
}
