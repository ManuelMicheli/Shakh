"use server";

import { createClient } from "@/lib/supabase/server";
import { scheduleNext, type SrsState } from "@/lib/tactics/srs";
import type { TrapMode } from "@/lib/traps/types";

const MS_PER_DAY = 86_400_000;

/** Segna la trappola come vista (primo accesso al viewer). Non tocca l'SRS. */
export async function markTrapSeen(trapId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: prev } = await supabase
    .from("user_trap_progress")
    .select("seen")
    .eq("user_id", user.id)
    .eq("trap_id", trapId)
    .maybeSingle<{ seen: boolean }>();

  if (prev?.seen) return; // già vista: niente da fare

  await supabase
    .from("user_trap_progress")
    .upsert(
      { user_id: user.id, trap_id: trapId, seen: true },
      { onConflict: "user_id,trap_id" },
    );
}

export interface TrapAttemptInput {
  trapId: string;
  mode: TrapMode;
  /** True se la modalità è stata superata (punizione trovata / trappola evitata). */
  success: boolean;
  /** True se proveniva dalla coda di ripasso (SRS già attivo). */
  fromReview: boolean;
}

export interface TrapAttemptResult {
  ok: boolean;
  error?: string;
}

/**
 * Registra un tentativo di allenamento su una trappola: aggiorna attempts/
 * successes e ricalcola l'SRS (SM-2, come nel 05). Le trappole sbagliate tornano
 * presto; quelle superate allungano l'intervallo. Tutto isolato per-utente.
 */
export async function recordTrapAttempt(
  input: TrapAttemptInput,
): Promise<TrapAttemptResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessione scaduta. Accedi di nuovo." };

  const { data: prev } = await supabase
    .from("user_trap_progress")
    .select("attempts, successes, ease, interval_days")
    .eq("user_id", user.id)
    .eq("trap_id", input.trapId)
    .maybeSingle<{
      attempts: number;
      successes: number;
      ease: number | null;
      interval_days: number | null;
    }>();

  const hadPrev = Boolean(prev);
  const prevSrs: SrsState | null = prev
    ? { ease: prev.ease ?? 2.5, intervalDays: prev.interval_days ?? 0 }
    : null;

  // Entra/aggiorna l'SRS sempre tranne il primo successo "a freddo" (mai vista
  // in allenamento e non da ripasso): in quel caso resta solo registrata.
  const shouldSchedule = !input.success || input.fromReview || hadPrev;
  let ease: number | null = prev?.ease ?? null;
  let intervalDays: number | null = prev?.interval_days ?? null;
  let dueAt: string | null = null;
  if (shouldSchedule) {
    const s = scheduleNext(prevSrs, input.success);
    ease = s.ease;
    intervalDays = s.intervalDays;
    dueAt = new Date(Date.now() + s.dueInDays * MS_PER_DAY).toISOString();
  }

  const { error } = await supabase.from("user_trap_progress").upsert(
    {
      user_id: user.id,
      trap_id: input.trapId,
      seen: true,
      attempts: (prev?.attempts ?? 0) + 1,
      successes: (prev?.successes ?? 0) + (input.success ? 1 : 0),
      ease: ease ?? 2.5,
      interval_days: intervalDays ?? 0,
      due_at: dueAt,
    },
    { onConflict: "user_id,trap_id" },
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
