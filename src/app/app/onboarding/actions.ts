"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { recomputePath, loadNodes } from "@/lib/path/recompute";
import { diagnose, type MiniTestResult, type SelfAssessment } from "@/lib/path/diagnostic";
import type { Puzzle } from "@/lib/tactics/types";

/** Bande di rating del mini-test, a difficoltà crescente. */
const TEST_BANDS = [700, 1000, 1300, 1500, 1700, 1900];

interface PuzzleRow {
  id: string;
  fen: string;
  moves: string;
  rating: number;
  themes: string[] | null;
  popularity: number | null;
}

function toPuzzle(r: PuzzleRow): Puzzle {
  return {
    id: r.id,
    fen: r.fen,
    moves: r.moves.split(" ").filter(Boolean),
    rating: r.rating,
    themes: r.themes ?? [],
    popularity: r.popularity,
  };
}

async function puzzleNear(supabase: SupabaseClient, center: number): Promise<Puzzle | null> {
  for (const width of [120, 250, 500]) {
    const { data } = await supabase
      .from("puzzles")
      .select("id,fen,moves,rating,themes,popularity")
      .gte("rating", center - width)
      .lte("rating", center + width)
      .order("popularity", { ascending: false })
      .limit(20);
    const rows = (data as PuzzleRow[] | null) ?? [];
    if (rows.length) return toPuzzle(rows[Math.floor(Math.random() * rows.length)]);
  }
  return null;
}

/**
 * Mini-test tattico: un puzzle per banda di difficoltà crescente.
 * Riusa il dataset del 05; nessuna ripetizione dello stesso puzzle.
 */
export async function getDiagnosticPuzzles(): Promise<Puzzle[]> {
  const supabase = await createClient();
  const seen = new Set<string>();
  const out: Puzzle[] = [];
  for (const band of TEST_BANDS) {
    const p = await puzzleNear(supabase, band);
    if (p && !seen.has(p.id)) {
      seen.add(p.id);
      out.push(p);
    }
  }
  return out;
}

export interface CompleteOnboardingInput {
  self: SelfAssessment;
  results: MiniTestResult[];
}

export interface CompleteResult {
  ok: boolean;
  error?: string;
  startingLevel?: number;
  eloEstimate?: number;
}

/**
 * Chiude il diagnostico: stima livello/rating, inizializza le statistiche,
 * posiziona l'utente nel percorso (i fondamentali sotto al livello di partenza
 * risultano già completati) e marca `onboarding_completed`.
 */
export async function completeOnboarding(
  input: CompleteOnboardingInput,
): Promise<CompleteResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const t = await getTranslations("common");
    return { ok: false, error: t("error.sessionExpired") };
  }

  // Un account online VERIFICATO durante l'onboarding ha già posizionato l'utente
  // (rating reale OTB → vedi seedFromVerifiedAccount): segnale ben più affidabile
  // dell'autovalutazione. In quel caso non sovrascrivere stima/livello: assicura
  // solo che l'onboarding risulti chiuso e ricalcola.
  const { data: verified } = await supabase
    .from("external_accounts")
    .select("source")
    .eq("user_id", user.id)
    .eq("verified", true)
    .limit(1);
  if (verified && verified.length > 0) {
    await supabase
      .from("profiles")
      .update({ onboarding_completed: true })
      .eq("id", user.id);
    await recomputePath(supabase, user.id);
    revalidatePath("/app/percorso");
    revalidatePath("/app");
    return { ok: true };
  }

  const dx = diagnose(input.self, input.results);

  // 1) Rating tattico iniziale (deviation più bassa: l'abbiamo misurato).
  await supabase.from("user_tactic_stats").upsert(
    {
      user_id: user.id,
      rating: dx.tacticRating,
      rating_deviation: 150,
    },
    { onConflict: "user_id" },
  );

  // 2) Profilo: stima Elo, livello, onboarding chiuso.
  await supabase
    .from("profiles")
    .update({
      elo_estimate: dx.eloEstimate,
      current_level: dx.startingLevel,
      onboarding_completed: true,
    })
    .eq("id", user.id);

  // 3) Skip dei fondamentali per chi entra più avanti: i nodi dei livelli
  //    inferiori al livello di partenza risultano già completati (completamento
  //    appiccicoso, rispettato dal ricalcolo). Un principiante (livello 0) non
  //    salta nulla.
  if (dx.startingLevel > 0) {
    const nodes = await loadNodes(supabase);
    const now = new Date().toISOString();
    const skip = nodes
      .filter((n) => n.level < dx.startingLevel)
      .map((n) => ({
        user_id: user.id,
        node_id: n.id,
        status: "completed" as const,
        progress: 1,
        completed_at: now,
      }));
    if (skip.length)
      await supabase
        .from("user_path_progress")
        .upsert(skip, { onConflict: "user_id,node_id" });
  }

  // 4) Ricalcolo idempotente: deriva stato e livello correnti.
  await recomputePath(supabase, user.id);

  revalidatePath("/app/percorso");
  revalidatePath("/app");
  return { ok: true, startingLevel: dx.startingLevel, eloEstimate: dx.eloEstimate };
}
