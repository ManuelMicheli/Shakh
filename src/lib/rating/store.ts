/**
 * API di lettura/scrittura del motore di rating.
 *
 * Stesso pattern di `tactics/query.ts`: NON è "use server", riceve un client
 * Supabase già autenticato (la RLS garantisce la proprietà dei dati). È l'UNICO
 * punto che scrive `user_ratings`/`rating_events` e che rispecchia il sotto-rating
 * tattico in `user_tactic_stats`. Le feature future (finali, calcolo) chiamano
 * `recordDomainOutcomes`.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  initialState,
  updateRatingPeriod,
  GLICKO_ANCHOR,
  PUZZLE_OPP_RD,
  VOL_START,
  type Glicko2State,
  type MatchOutcome,
} from "./glicko2";
import {
  aggregateOverall,
  externalRdFromGames,
  EXTERNAL_MAX_SAMPLES,
  type DomainRating,
  type OverallRating,
  type RatingDomain,
} from "./aggregate";
import { lichessPuzzleToOtb } from "./calibration";
import {
  computeCeiling,
  bandFloorOf,
  CEILING_HEADROOM,
  type BandResult,
} from "./ceiling";

type DB = SupabaseClient;

const ALL_DOMAINS: RatingDomain[] = [
  "tactic",
  "games",
  "endgame",
  "calculation",
  "play_quality",
  "external",
];

interface RatingRow {
  domain: string;
  rating: number;
  rd: number;
  vol: number;
  samples: number;
  provisional: boolean;
  ceiling: number | null;
}

const RATING_COLS = "domain,rating,rd,vol,samples,provisional,ceiling";

// ============================================================
// Lettura
// ============================================================

/** Stato di tutti i domìni (assenti → stato iniziale a 0 campioni). */
export async function loadDomainRatings(supabase: DB, userId: string): Promise<DomainRating[]> {
  const { data } = await supabase
    .from("user_ratings")
    .select(RATING_COLS)
    .eq("user_id", userId);
  const rows = (data as RatingRow[] | null) ?? [];
  const byDomain = new Map(rows.map((r) => [r.domain, r]));
  return ALL_DOMAINS.map((domain) => {
    const r = byDomain.get(domain);
    return r
      ? { domain, state: { rating: r.rating, rd: r.rd, vol: r.vol }, samples: r.samples }
      : { domain, state: initialState(), samples: 0 };
  });
}

/** Rating complessivo già aggregato + breakdown per dominio per la dashboard. */
export async function loadOverallRating(supabase: DB, userId: string): Promise<OverallRating | null> {
  const { data } = await supabase
    .from("user_ratings")
    .select(RATING_COLS)
    .eq("user_id", userId);
  const rows = (data as RatingRow[] | null) ?? [];
  if (rows.length === 0) return null;

  const overallRow = rows.find((r) => r.domain === "overall");
  const ceiling = overallRow?.ceiling ?? 1000;
  const domains: DomainRating[] = ALL_DOMAINS.map((domain) => {
    const r = rows.find((x) => x.domain === domain);
    return r
      ? { domain, state: { rating: r.rating, rd: r.rd, vol: r.vol }, samples: r.samples }
      : { domain, state: initialState(), samples: 0 };
  });
  // Ricostruisce il breakdown e i valori complessivi in modo coerente con la
  // riga 'overall' persistita (il tetto è quello salvato).
  return aggregateOverall(domains, ceiling);
}

// ============================================================
// Scrittura
// ============================================================

/** Registra l'esito di un puzzle (forza avversario già su scala OTB). Ritorna il nuovo stato tattico. */
export async function applyTacticOutcome(
  supabase: DB,
  userId: string,
  opponentOtb: number,
  score: number,
): Promise<Glicko2State> {
  const domains = await loadDomainRatings(supabase, userId);
  const tactic = domains.find((d) => d.domain === "tactic")!;
  const before = tactic.state.rating;

  const next = updateRatingPeriod(tactic.state, [
    { opponentRating: opponentOtb, opponentRd: PUZZLE_OPP_RD, score },
  ]);
  tactic.state = next;
  tactic.samples += 1;

  const ceiling = await recomputeCeiling(supabase, userId, domains);
  const overall = aggregateOverall(domains, ceiling);

  await persist(supabase, userId, domains, overall, { syncTactic: true });
  await logEvent(supabase, userId, "tactic", next.rating - before, "puzzle", {
    opponentOtb,
    score,
  });
  return next;
}

/** Registra un lotto di partite analizzate: aggiorna i domìni games + play_quality. */
export async function applyGameBatch(
  supabase: DB,
  userId: string,
  outcomes: { games: MatchOutcome[]; playQuality: MatchOutcome[] },
): Promise<void> {
  if (outcomes.games.length === 0 && outcomes.playQuality.length === 0) return;
  const domains = await loadDomainRatings(supabase, userId);

  const games = domains.find((d) => d.domain === "games")!;
  const pq = domains.find((d) => d.domain === "play_quality")!;
  const gBefore = games.state.rating;
  const pqBefore = pq.state.rating;

  if (outcomes.games.length) {
    games.state = updateRatingPeriod(games.state, outcomes.games);
    games.samples += outcomes.games.length;
  }
  if (outcomes.playQuality.length) {
    pq.state = updateRatingPeriod(pq.state, outcomes.playQuality);
    pq.samples += outcomes.playQuality.length;
  }

  const ceiling = await recomputeCeiling(supabase, userId, domains);
  const overall = aggregateOverall(domains, ceiling);
  await persist(supabase, userId, domains, overall, { syncTactic: false });
  await logEvent(supabase, userId, "games", games.state.rating - gBefore, "game_batch", {
    games: outcomes.games.length,
  });
  await logEvent(supabase, userId, "play_quality", pq.state.rating - pqBefore, "game_batch", {
    moves: outcomes.playQuality.length,
  });
}

/**
 * API generica per le feature future (finali, calcolo).
 * Aggiorna un dominio con un lotto di esiti e ricalcola il complessivo.
 */
export async function recordDomainOutcomes(
  supabase: DB,
  userId: string,
  domain: RatingDomain,
  outcomes: MatchOutcome[],
  reason: string,
): Promise<void> {
  if (outcomes.length === 0) return;
  const domains = await loadDomainRatings(supabase, userId);
  const target = domains.find((d) => d.domain === domain)!;
  const before = target.state.rating;
  target.state = updateRatingPeriod(target.state, outcomes);
  target.samples += outcomes.length;

  const ceiling = await recomputeCeiling(supabase, userId, domains);
  const overall = aggregateOverall(domains, ceiling);
  await persist(supabase, userId, domains, overall, { syncTactic: domain === "tactic" });
  await logEvent(supabase, userId, domain, target.state.rating - before, reason, {
    count: outcomes.length,
  });
}

/**
 * Semina/aggiorna il dominio 'external' dal rating di un account online collegato.
 *
 * A differenza degli altri domìni, il rating online è una MISURA esterna diretta:
 * non lo facciamo convergere con esiti Glicko, ma fissiamo lo stato del dominio
 * a `(otb, rd)` dove `rd` riflette quante partite valutate ci sono dietro. Con
 * priore alto (`DOMAIN_PRIOR.external`) e RD bassa pesa MOLTO nell'aggregato, ma
 * gli altri segnali (tattica, partite reali sulla piattaforma…) continuano a
 * muovere il complessivo. Alza anche il tetto anti-inflazione (forza dimostrata).
 *
 * Idempotente: ri-chiamarla a ogni refresh sovrascrive lo stato external.
 */
export async function applyExternalRating(
  supabase: DB,
  userId: string,
  otb: number,
  nGames: number,
): Promise<void> {
  const domains = await loadDomainRatings(supabase, userId);
  const ext = domains.find((d) => d.domain === "external")!;
  const before = ext.samples > 0 ? ext.state.rating : otb;

  ext.state = { rating: otb, rd: externalRdFromGames(nGames), vol: VOL_START };
  ext.samples = Math.min(nGames, EXTERNAL_MAX_SAMPLES);

  const ceiling = await recomputeCeiling(supabase, userId, domains);
  const overall = aggregateOverall(domains, ceiling);
  await persist(supabase, userId, domains, overall, { syncTactic: false });
  await logEvent(supabase, userId, "external", otb - before, "account_link", {
    otb,
    nGames,
  });
}

/** Azzera il contributo del dominio 'external' (account scollegato). */
export async function clearExternalRating(supabase: DB, userId: string): Promise<void> {
  const domains = await loadDomainRatings(supabase, userId);
  const ext = domains.find((d) => d.domain === "external")!;
  if (ext.samples === 0) return;
  ext.state = initialState();
  ext.samples = 0;

  const ceiling = await recomputeCeiling(supabase, userId, domains);
  const overall = aggregateOverall(domains, ceiling);
  await persist(supabase, userId, domains, overall, { syncTactic: false });
  await logEvent(supabase, userId, "external", 0, "account_unlink", {});
}

// ============================================================
// Interni
// ============================================================

/**
 * Tetto effettivo = max fra:
 *  - tetto da fasce di puzzle superate con costanza (anti-inflazione tattica);
 *  - forza già DIMOSTRATA dagli altri domìni (perf-rating: nessun rischio di
 *    gonfiaggio) + headroom.
 * Così il principiante che fa solo puzzle facili resta basso, ma chi ha provato
 * forza nelle partite non viene tagliato ingiustamente.
 */
async function recomputeCeiling(
  supabase: DB,
  userId: string,
  domains: DomainRating[],
): Promise<number> {
  const bands = await loadPuzzleBands(supabase, userId);
  const puzzleCeiling = computeCeiling(bands);

  let proven = -Infinity;
  for (const d of domains) {
    if (d.domain === "tactic") continue;
    if (d.samples > 0) proven = Math.max(proven, d.state.rating + CEILING_HEADROOM);
  }
  return proven === -Infinity ? puzzleCeiling : Math.max(puzzleCeiling, proven);
}

/** Aggrega gli ultimi tentativi in fasce OTB (difficoltà del puzzle calibrata). */
async function loadPuzzleBands(supabase: DB, userId: string): Promise<BandResult[]> {
  const { data } = await supabase
    .from("user_puzzle_attempts")
    .select("success, puzzles(rating)")
    .eq("user_id", userId)
    .order("attempted_at", { ascending: false })
    .limit(3000);

  const rows =
    (data as { success: boolean; puzzles: { rating: number } | null }[] | null) ?? [];
  const byBand = new Map<number, { attempts: number; successes: number }>();
  for (const r of rows) {
    if (!r.puzzles) continue;
    const otb = lichessPuzzleToOtb(r.puzzles.rating);
    const floor = bandFloorOf(otb);
    const cur = byBand.get(floor) ?? { attempts: 0, successes: 0 };
    cur.attempts += 1;
    if (r.success) cur.successes += 1;
    byBand.set(floor, cur);
  }
  return Array.from(byBand.entries()).map(([bandFloor, c]) => ({
    bandFloor,
    attempts: c.attempts,
    successes: c.successes,
  }));
}

interface PersistOpts {
  syncTactic: boolean;
}

interface RatingUpsert {
  user_id: string;
  domain: string;
  rating: number;
  rd: number;
  vol: number;
  samples: number;
  provisional: boolean;
  ceiling: number | null;
}

/** Scrive le righe di dominio + la riga 'overall' (+ mirror tattico) in batch. */
async function persist(
  supabase: DB,
  userId: string,
  domains: DomainRating[],
  overall: OverallRating,
  opts: PersistOpts,
): Promise<void> {
  const totalSamples = domains.reduce((s, d) => s + d.samples, 0);
  const rows: RatingUpsert[] = domains.map((d) => {
    const bd = overall.breakdown.find((b) => b.domain === d.domain);
    return {
      user_id: userId,
      domain: d.domain,
      rating: d.state.rating,
      rd: d.state.rd,
      vol: d.state.vol,
      samples: d.samples,
      provisional: bd?.provisional ?? true,
      ceiling: null,
    };
  });
  rows.push({
    user_id: userId,
    domain: "overall",
    rating: overall.rating ?? GLICKO_ANCHOR,
    rd: overall.rd,
    vol: VOL_START,
    samples: totalSamples,
    provisional: overall.provisional,
    ceiling: overall.ceiling,
  });

  await supabase.from("user_ratings").upsert(rows, { onConflict: "user_id,domain" });

  if (opts.syncTactic) {
    const tactic = domains.find((d) => d.domain === "tactic");
    if (tactic) {
      await supabase
        .from("user_tactic_stats")
        .update({
          rating: Math.round(tactic.state.rating),
          rating_deviation: Math.round(tactic.state.rd),
        })
        .eq("user_id", userId);
    }
  }
}

async function logEvent(
  supabase: DB,
  userId: string,
  domain: RatingDomain,
  delta: number,
  reason: string,
  meta: Record<string, unknown>,
): Promise<void> {
  await supabase.from("rating_events").insert({
    user_id: userId,
    domain,
    delta: Math.round(delta),
    reason,
    meta,
  });
}
