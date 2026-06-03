/**
 * Aggregazioni server-side per la dashboard dei progressi (prompt 08).
 *
 * SOLO LETTURE: interroga i dati prodotti dagli altri moduli e li aggrega per
 * la UI. Nessuna scrittura di progressi, nessuna duplicazione della logica di
 * sblocco del percorso (07). Riceve un client Supabase già autenticato.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { computeMetrics, type MetricGame, type MetricRow } from "@/lib/ai/metrics";
import { moverFromPly } from "@/lib/ai/format";
import { themeLabel } from "@/lib/tactics/themes";
import type { UserMetrics } from "@/lib/ai/types";
import type { CoachSynthesis } from "@/lib/ai/types";
import { loadOverallRating } from "@/lib/rating/store";
import type { OverallRating } from "@/lib/rating/aggregate";

type DB = SupabaseClient;

// ============================================================
// Tipi della dashboard
// ============================================================

export type AreaKey = "tattica" | "aperture" | "mediogioco" | "finali" | "trappole";

export interface AreaCompetence {
  area: AreaKey;
  label: string;
  /** Competenza 0..1 (media pesata per tentativi) o null se nessun dato. */
  score: number | null;
  attempts: number;
}

export interface Weakness {
  /** Etichetta leggibile del punto debole. */
  label: string;
  area: AreaKey;
  score: number;
  attempts: number;
  /** Azione diretta verso il modulo che lo allena. */
  action: { label: string; href: string };
}

export interface ColorStats {
  color: "white" | "black";
  games: number;
  moves: number;
  accuracy: number | null; // 0..1
}

export interface GameStats {
  analyzed: number;
  accuracy: number | null; // 0..1 complessiva (mosse dell'utente)
  distribution: { inaccuracies: number; mistakes: number; blunders: number };
  byPhase: UserMetrics["byPhase"];
  worstPhase: UserMetrics["worstPhase"];
  byColor: ColorStats[];
}

export interface TrendPoint {
  label: string;
  value: number;
}

export interface Trends {
  rating: TrendPoint[];
  accuracy: TrendPoint[];
}

export interface TacticSummary {
  rating: number | null;
  /** Variazione rispetto al primo punto disponibile nello storico recente. */
  delta: number | null;
  currentStreak: number;
  bestStreak: number;
  solved: number;
  failed: number;
}

export interface PathProgress {
  currentLevel: number;
  completedNodes: number;
  totalNodes: number;
}

export interface RecentItem {
  kind: "game" | "puzzle" | "lesson";
  label: string;
  detail: string;
  at: string;
  href: string;
}

export interface DashboardData {
  competence: AreaCompetence[];
  weaknesses: Weakness[];
  game: GameStats;
  trends: Trends;
  tactic: TacticSummary;
  /** Rating Shakh olistico (OTB, multi-segnale). null se nessun dato. */
  shakhRating: OverallRating | null;
  path: PathProgress;
  synthesis: CoachSynthesis | null;
  recent: RecentItem[];
  /** True se l'utente non ha ancora dati sufficienti per i grafici. */
  empty: boolean;
}

// ============================================================
// Helper
// ============================================================

const AREA_LABEL: Record<AreaKey, string> = {
  tattica: "Tattica",
  aperture: "Aperture",
  mediogioco: "Mediogioco",
  finali: "Finali",
  trappole: "Trappole",
};

const ENDGAME_SLUG: Record<string, string> = {
  kq_vs_k: "matti-elementari",
  kp_vs_k: "re-e-pedone-contro-re",
  q_vs_p: "donna-contro-pedone",
  lucena: "posizione-di-lucena",
  philidor: "posizione-di-philidor",
};

interface ProgressRow {
  dimension: string;
  key: string;
  score: number;
  attempts: number;
}

/** Mappa una riga user_progress nell'area macro e in un'azione di allenamento. */
function describeWeakness(row: ProgressRow): Weakness | null {
  const { dimension, key, score, attempts } = row;
  switch (dimension) {
    case "tactic_theme":
      return {
        label: themeLabel(key),
        area: "tattica",
        score,
        attempts,
        action: { label: "Allena", href: "/app/tattiche" },
      };
    case "opening":
      return {
        label: `Apertura: ${key.replace(/_/g, " ")}`,
        area: "aperture",
        score,
        attempts,
        action: { label: "Ripassa", href: "/app/repertorio" },
      };
    case "middlegame_theme":
      return {
        label: `Mediogioco: ${key.replace(/_/g, " ")}`,
        area: "mediogioco",
        score,
        attempts,
        action: { label: "Esercizio", href: "/app/teoria/mediogioco" },
      };
    case "endgame":
      return {
        label: `Finale: ${key.replace(/_/g, " ")}`,
        area: "finali",
        score,
        attempts,
        action: {
          label: "Pratica",
          href: `/app/teoria/${ENDGAME_SLUG[key] ?? "matti-elementari"}`,
        },
      };
    default:
      return null; // 'phase' non è un punto debole allenabile direttamente
  }
}

const AREA_OF_DIMENSION: Record<string, AreaKey> = {
  tactic_theme: "tattica",
  opening: "aperture",
  middlegame_theme: "mediogioco",
  endgame: "finali",
};

/** Media pesata per tentativi di un insieme di righe. */
function weighted(rows: ProgressRow[]): { score: number | null; attempts: number } {
  const attempts = rows.reduce((s, r) => s + r.attempts, 0);
  if (attempts === 0) return { score: null, attempts: 0 };
  const sum = rows.reduce((s, r) => s + r.score * r.attempts, 0);
  return { score: sum / attempts, attempts };
}

// ============================================================
// Loader principale
// ============================================================

export async function loadDashboard(supabase: DB, userId: string): Promise<DashboardData> {
  const [
    progressRows,
    trapAgg,
    gameData,
    tactic,
    ratingHistory,
    pathAgg,
    synthesis,
    recent,
    shakhRating,
  ] = await Promise.all([
    loadProgressRows(supabase, userId),
    loadTrapCompetence(supabase, userId),
    loadGameStats(supabase, userId),
    loadTacticSummary(supabase, userId),
    loadRatingTrend(supabase, userId),
    loadPathProgress(supabase, userId),
    loadSynthesis(supabase, userId),
    loadRecent(supabase, userId),
    loadOverallRating(supabase, userId),
  ]);

  // Competenza per area (4 da user_progress + trappole da user_trap_progress).
  const competence: AreaCompetence[] = (
    ["tattica", "aperture", "mediogioco", "finali"] as AreaKey[]
  ).map((area) => {
    const rows = progressRows.filter((r) => AREA_OF_DIMENSION[r.dimension] === area);
    const w = weighted(rows);
    return { area, label: AREA_LABEL[area], score: w.score, attempts: w.attempts };
  });
  competence.push({
    area: "trappole",
    label: AREA_LABEL.trappole,
    score: trapAgg.score,
    attempts: trapAgg.attempts,
  });

  // Punti deboli prioritari: score basso e abbastanza tentativi, ordinati.
  const MIN_ATTEMPTS = 3;
  const weaknesses = progressRows
    .filter((r) => r.attempts >= MIN_ATTEMPTS && r.score < 0.7)
    .map(describeWeakness)
    .filter((w): w is Weakness => w !== null)
    .sort((a, b) => a.score - b.score)
    .slice(0, 5);

  const empty =
    gameData.stats.analyzed === 0 &&
    progressRows.length === 0 &&
    trapAgg.attempts === 0 &&
    tactic.rating === null;

  return {
    competence,
    weaknesses,
    game: gameData.stats,
    trends: { rating: ratingHistory, accuracy: gameData.accuracyTrend },
    tactic,
    shakhRating,
    path: pathAgg,
    synthesis,
    recent,
    empty,
  };
}

// ============================================================
// Loader specifici
// ============================================================

async function loadProgressRows(supabase: DB, userId: string): Promise<ProgressRow[]> {
  const { data } = await supabase
    .from("user_progress")
    .select("dimension, key, score, attempts")
    .eq("user_id", userId);
  return (data as ProgressRow[] | null) ?? [];
}

async function loadTrapCompetence(
  supabase: DB,
  userId: string,
): Promise<{ score: number | null; attempts: number }> {
  const { data } = await supabase
    .from("user_trap_progress")
    .select("attempts, successes")
    .eq("user_id", userId);
  const rows = (data as { attempts: number; successes: number }[] | null) ?? [];
  const attempts = rows.reduce((s, r) => s + r.attempts, 0);
  const successes = rows.reduce((s, r) => s + r.successes, 0);
  if (attempts === 0) return { score: null, attempts: 0 };
  return { score: successes / attempts, attempts };
}

interface GameRowLite {
  id: string;
  user_color: "white" | "black" | null;
  played_at: string | null;
  created_at: string;
}

async function loadGameStats(
  supabase: DB,
  userId: string,
): Promise<{ stats: GameStats; accuracyTrend: TrendPoint[] }> {
  const { data: gamesData } = await supabase
    .from("games")
    .select("id, user_color, played_at, created_at")
    .eq("user_id", userId)
    .eq("analyzed", true)
    .order("played_at", { ascending: true, nullsFirst: true });
  const games = (gamesData as GameRowLite[] | null) ?? [];

  if (games.length === 0) {
    return {
      stats: {
        analyzed: 0,
        accuracy: null,
        distribution: { inaccuracies: 0, mistakes: 0, blunders: 0 },
        byPhase: [],
        worstPhase: null,
        byColor: [],
      },
      accuracyTrend: [],
    };
  }

  const ids = games.map((g) => g.id);
  const { data: rowsData } = await supabase
    .from("game_analysis")
    .select("game_id, ply, fen, classification")
    .in("game_id", ids);
  const rows = (rowsData as MetricRow[] | null) ?? [];

  const metricGames: MetricGame[] = games.map((g) => ({ id: g.id, user_color: g.user_color }));
  const overall = computeMetrics(metricGames, rows);
  const accuracy =
    overall.userMoves > 0
      ? Math.max(
          0,
          1 - (overall.inaccuracies + overall.mistakes + overall.blunders) / overall.userMoves,
        )
      : null;

  // Per colore.
  const byColor: ColorStats[] = (["white", "black"] as const).map((color) => {
    const subset = metricGames.filter((g) => g.user_color === color);
    const subsetIds = new Set(subset.map((g) => g.id));
    const subsetRows = rows.filter((r) => subsetIds.has(r.game_id));
    const m = computeMetrics(subset, subsetRows);
    const acc =
      m.userMoves > 0
        ? Math.max(0, 1 - (m.inaccuracies + m.mistakes + m.blunders) / m.userMoves)
        : null;
    return { color, games: m.games, moves: m.userMoves, accuracy: acc };
  });

  // Andamento accuratezza nel tempo (una % per partita, in ordine cronologico).
  const colorById = new Map(games.map((g) => [g.id, g.user_color]));
  const rowsByGame = new Map<string, MetricRow[]>();
  for (const r of rows) {
    const list = rowsByGame.get(r.game_id) ?? [];
    list.push(r);
    rowsByGame.set(r.game_id, list);
  }
  const accuracyTrend: TrendPoint[] = [];
  for (const g of games) {
    const color = colorById.get(g.id);
    if (!color) continue;
    const gRows = rowsByGame.get(g.id) ?? [];
    let moves = 0;
    let errors = 0;
    for (const r of gRows) {
      if (moverFromPly(r.ply) !== color) continue;
      moves++;
      if (
        r.classification === "inaccuracy" ||
        r.classification === "mistake" ||
        r.classification === "miss" ||
        r.classification === "blunder"
      )
        errors++;
    }
    if (moves === 0) continue;
    accuracyTrend.push({
      label: formatDate(g.played_at ?? g.created_at),
      value: Math.round((1 - errors / moves) * 100),
    });
  }

  return {
    stats: {
      analyzed: games.length,
      accuracy,
      distribution: {
        inaccuracies: overall.inaccuracies,
        mistakes: overall.mistakes,
        blunders: overall.blunders,
      },
      byPhase: overall.byPhase,
      worstPhase: overall.worstPhase,
      byColor,
    },
    accuracyTrend,
  };
}

async function loadTacticSummary(supabase: DB, userId: string): Promise<TacticSummary> {
  const { data } = await supabase
    .from("user_tactic_stats")
    .select("rating, current_streak, best_streak, puzzles_solved, puzzles_failed")
    .eq("user_id", userId)
    .maybeSingle<{
      rating: number;
      current_streak: number;
      best_streak: number;
      puzzles_solved: number;
      puzzles_failed: number;
    }>();
  if (!data) {
    return { rating: null, delta: null, currentStreak: 0, bestStreak: 0, solved: 0, failed: 0 };
  }

  // Delta rispetto al rating di ~30 giorni fa (o al primo disponibile).
  const { data: hist } = await supabase
    .from("tactic_rating_history")
    .select("rating, recorded_at")
    .eq("user_id", userId)
    .order("recorded_at", { ascending: true })
    .limit(1)
    .maybeSingle<{ rating: number }>();
  const delta = hist ? data.rating - hist.rating : null;

  return {
    rating: data.rating,
    delta,
    currentStreak: data.current_streak,
    bestStreak: data.best_streak,
    solved: data.puzzles_solved,
    failed: data.puzzles_failed,
  };
}

async function loadRatingTrend(supabase: DB, userId: string): Promise<TrendPoint[]> {
  const { data } = await supabase
    .from("tactic_rating_history")
    .select("rating, recorded_at")
    .eq("user_id", userId)
    .order("recorded_at", { ascending: true })
    .limit(100);
  const rows = (data as { rating: number; recorded_at: string }[] | null) ?? [];
  return rows.map((r) => ({ label: formatDate(r.recorded_at), value: r.rating }));
}

async function loadPathProgress(supabase: DB, userId: string): Promise<PathProgress> {
  const [{ data: profile }, { count: total }, { count: completed }] = await Promise.all([
    supabase.from("profiles").select("current_level").eq("id", userId).maybeSingle<{ current_level: number }>(),
    supabase.from("path_nodes").select("id", { count: "exact", head: true }).eq("published", true),
    supabase
      .from("user_path_progress")
      .select("node_id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "completed"),
  ]);
  return {
    currentLevel: profile?.current_level ?? 0,
    completedNodes: completed ?? 0,
    totalNodes: total ?? 0,
  };
}

async function loadSynthesis(supabase: DB, userId: string): Promise<CoachSynthesis | null> {
  const { data } = await supabase
    .from("coach_synthesis")
    .select("summary, focus_areas, suggestion")
    .eq("user_id", userId)
    .maybeSingle<{ summary: string; focus_areas: string[]; suggestion: string | null }>();
  if (!data) return null;
  return { summary: data.summary, focusAreas: data.focus_areas ?? [], suggestion: data.suggestion ?? "" };
}

async function loadRecent(supabase: DB, userId: string): Promise<RecentItem[]> {
  const [games, puzzles, lessons] = await Promise.all([
    supabase
      .from("games")
      .select("id, white, black, result, played_at, created_at")
      .eq("user_id", userId)
      .eq("analyzed", true)
      .order("created_at", { ascending: false })
      .limit(4),
    supabase
      .from("user_puzzle_attempts")
      .select("puzzle_id, success, attempted_at")
      .eq("user_id", userId)
      .order("attempted_at", { ascending: false })
      .limit(4),
    supabase
      .from("content_completions")
      .select("content_item_id, completed_at, content_items(title, slug)")
      .eq("user_id", userId)
      .order("completed_at", { ascending: false })
      .limit(4),
  ]);

  const items: RecentItem[] = [];

  for (const g of (games.data as
    | { id: string; white: string | null; black: string | null; result: string | null; played_at: string | null; created_at: string }[]
    | null) ?? []) {
    items.push({
      kind: "game",
      label: `${g.white ?? "?"} – ${g.black ?? "?"}`,
      detail: g.result ?? "analizzata",
      at: g.played_at ?? g.created_at,
      href: `/app/partite/${g.id}`,
    });
  }

  for (const p of (puzzles.data as { success: boolean; attempted_at: string }[] | null) ?? []) {
    items.push({
      kind: "puzzle",
      label: "Puzzle tattico",
      detail: p.success ? "risolto" : "fallito",
      at: p.attempted_at,
      href: "/app/tattiche",
    });
  }

  for (const l of (lessons.data as
    | { completed_at: string; content_items: { title: string; slug: string } | null }[]
    | null) ?? []) {
    if (!l.content_items) continue;
    items.push({
      kind: "lesson",
      label: l.content_items.title,
      detail: "lezione completata",
      at: l.completed_at,
      href: `/app/teoria/${l.content_items.slug}`,
    });
  }

  return items.sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 8);
}

/** Data breve gg/mm per le etichette dei grafici. */
function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}
