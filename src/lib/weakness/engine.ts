/**
 * Weakness Engine (Fase 2): individua i PATTERN d'errore RICORRENTI dalle
 * partite analizzate — non il singolo sbaglio, ma la perdita sistematica che si
 * ripete fra partite (es. "sprechi le posizioni vinte", "crolli nei finali",
 * "errori dopo la mossa 30").
 *
 * Tutto deterministico, NESSUNA AI: aggrega le righe `game_analysis` già
 * prodotte dal motore. Riusa i decoder di `evalScore.ts` e l'attribuzione
 * mossa↔colore/fase di `ai/format.ts`. Stesso pattern reader di `tactics/query.ts`.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { decodeEval, toMoverCp } from "@/lib/analysis/evalScore";
import { moverFromPly, phaseFromFen } from "@/lib/ai/format";
import type { GamePhase } from "@/lib/ai/types";
import type { Classification } from "@/lib/games/types";

type DB = SupabaseClient;

/** Soglia minima di partite analizzate per avere un quadro affidabile. */
export const MIN_ANALYZED_GAMES = 3;
/** Occorrenze minime perché un pattern conti come "ricorrente". */
const MIN_OCCURRENCES = 4;
/** Partite distinte minime perché un pattern conti come "ricorrente". */
const MIN_GAMES = 2;
/** Numero massimo di partite recenti considerate. */
const MAX_GAMES = 40;
/** Perdita massima attribuita a una singola mossa (cp). */
const MAX_LOSS = 1000;

const ERROR_CLASSES: ReadonlySet<string> = new Set(["inaccuracy", "mistake", "miss", "blunder"]);

export interface WeaknessExample {
  gameId: string;
  ply: number;
}

export interface WeaknessPattern {
  id: string;
  label: string;
  description: string;
  /** Gravità 0..1 per l'ordinamento e la barra UI. */
  severity: number;
  occurrences: number;
  games: number;
  /** Centipawn medi persi per occorrenza. */
  avgCpLoss: number;
  examples: WeaknessExample[];
  action: { label: string; href: string };
}

// Strutture intermedie ------------------------------------------------------

interface GameLite {
  id: string;
  user_color: "white" | "black" | null;
  eco_code: string | null;
}

interface AnalysisRow {
  game_id: string;
  ply: number;
  fen: string;
  eval_before: number | null;
  eval_after: number | null;
  best_move_san: string | null;
  classification: Classification | null;
}

interface ErrorMove {
  gameId: string;
  ply: number;
  phase: GamePhase;
  cpBefore: number; // POV utente
  cpLoss: number;
  bestSan: string | null;
  eco: string | null;
}

// ============================================================
// Loader
// ============================================================

/** Carica le ultime partite analizzate e ne ricava i pattern di debolezza. */
export async function loadWeaknesses(
  supabase: DB,
  userId: string,
): Promise<{ analyzedGames: number; patterns: WeaknessPattern[] }> {
  const { data: gamesData } = await supabase
    .from("games")
    .select("id, user_color, eco_code")
    .eq("user_id", userId)
    .eq("analyzed", true)
    .eq("counts_for_profile", true) // solo partite del proprio account verificato
    .order("played_at", { ascending: false, nullsFirst: false })
    .limit(MAX_GAMES);
  const games = (gamesData as GameLite[] | null) ?? [];
  if (games.length < MIN_ANALYZED_GAMES) {
    return { analyzedGames: games.length, patterns: [] };
  }

  const ids = games.map((g) => g.id);
  const { data: rowsData } = await supabase
    .from("game_analysis")
    .select("game_id, ply, fen, eval_before, eval_after, best_move_san, classification")
    .in("game_id", ids);
  const rows = (rowsData as AnalysisRow[] | null) ?? [];

  return { analyzedGames: games.length, patterns: detectWeaknesses(games, rows) };
}

// ============================================================
// Rilevamento (puro)
// ============================================================

export function detectWeaknesses(
  games: { id: string; user_color: "white" | "black" | null; eco_code: string | null }[],
  rows: AnalysisRow[],
): WeaknessPattern[] {
  const colorOf = new Map(games.map((g) => [g.id, g.user_color]));
  const ecoOf = new Map(games.map((g) => [g.id, g.eco_code]));

  const errors: ErrorMove[] = [];
  const phaseMoves: Record<GamePhase, number> = { opening: 0, middlegame: 0, endgame: 0 };
  const phaseErrors: Record<GamePhase, ErrorMove[]> = { opening: [], middlegame: [], endgame: [] };

  for (const r of rows) {
    const color = colorOf.get(r.game_id);
    if (!color) continue;
    if (moverFromPly(r.ply) !== color) continue; // solo mosse dell'utente
    if (r.eval_before == null || r.eval_after == null) continue;

    const phase = phaseFromFen(r.fen);
    phaseMoves[phase] += 1;

    if (!r.classification || !ERROR_CLASSES.has(r.classification)) continue;

    const isWhite = color === "white";
    const cpBefore = toMoverCp(decodeEval(r.eval_before), isWhite);
    const cpAfter = toMoverCp(decodeEval(r.eval_after), isWhite);
    const cpLoss = Math.min(MAX_LOSS, Math.max(0, cpBefore - cpAfter));

    const em: ErrorMove = {
      gameId: r.game_id,
      ply: r.ply,
      phase,
      cpBefore,
      cpLoss,
      bestSan: r.best_move_san,
      eco: ecoOf.get(r.game_id) ?? null,
    };
    errors.push(em);
    phaseErrors[phase].push(em);
  }

  const candidates: WeaknessPattern[] = [];
  const push = (p: WeaknessPattern | null) => {
    if (p) candidates.push(p);
  };

  // 1) Spreco del vantaggio.
  push(
    build(
      "squander_advantage",
      "Sprechi le posizioni vinte",
      errors.filter((e) => e.cpBefore >= 150 && e.cpLoss >= 150),
      (occ, gms, avg) =>
        `${occ} volte in ${gms} partite hai gettato un vantaggio chiaro (in media −${pawns(avg)}). Allena la conversione e il calcolo.`,
      { label: "Allena tattica", href: "/app/tattiche?mode=adaptive" },
    ),
  );

  // 2) Crollo sotto pressione (posizione leggermente peggiore → molto peggiore).
  push(
    build(
      "defense_collapse",
      "Affondi quando sei sotto pressione",
      errors.filter((e) => e.cpBefore <= -30 && e.cpBefore >= -300 && e.cpLoss >= 150),
      (occ, gms, avg) =>
        `${occ} volte in ${gms} partite, da posizione un po' peggiore sei sprofondato (−${pawns(avg)}). Lavora sulla difesa e sulla calma.`,
      { label: "Allena tattica", href: "/app/tattiche?mode=adaptive" },
    ),
  );

  // 3) Errori in zona tempo (dalla mossa 31 in poi).
  push(
    build(
      "time_pressure",
      "Errori dopo la mossa 30",
      errors.filter((e) => e.ply >= 61 && e.cpLoss >= 120),
      (occ, gms, avg) =>
        `${occ} errori gravi in ${gms} partite oltre la mossa 30 (−${pawns(avg)}). Spesso è gestione del tempo: prova le sfide a tempo.`,
      { label: "Sfida a tempo", href: "/app/tattiche?mode=timed" },
    ),
  );

  // 4) Colpi tattici mancati (la mossa migliore era forzante: cattura/scacco/promozione).
  push(
    build(
      "missed_tactic",
      "Ti sfuggono i colpi tattici",
      errors.filter((e) => e.cpLoss >= 200 && isForcing(e.bestSan)),
      (occ, gms, avg) =>
        `${occ} volte in ${gms} partite c'era un colpo forzante che non hai visto (−${pawns(avg)}). Più puzzle di visione tattica.`,
      { label: "Allena tattica", href: "/app/tattiche?mode=adaptive" },
    ),
  );

  // 5) Fase debole (per tasso d'errore, non solo conteggio).
  const PHASE_INFO: Record<GamePhase, { label: string; href: string }> = {
    opening: { label: "in apertura", href: "/app/teoria/aperture" },
    middlegame: { label: "nel mediogioco", href: "/app/teoria/mediogioco" },
    endgame: { label: "nei finali", href: "/app/teoria/finali" },
  };
  (Object.keys(phaseMoves) as GamePhase[]).forEach((ph) => {
    const moves = phaseMoves[ph];
    const errs = phaseErrors[ph];
    if (moves < 20 || errs.length < MIN_OCCURRENCES) return;
    const rate = errs.length / moves;
    if (rate < 0.18) return;
    const info = PHASE_INFO[ph];
    push(
      build(
        `phase_${ph}`,
        `Fragile ${info.label}`,
        errs,
        (occ, gms) =>
          `Tasso d'errore ${Math.round(rate * 100)}% ${info.label} (${occ} errori in ${gms} partite). Ripassa la teoria della fase.`,
        { label: "Ripassa", href: info.href },
      ),
    );
  });

  // 6) Apertura/ECO specifica problematica (errori in apertura per famiglia ECO).
  const byEco = new Map<string, ErrorMove[]>();
  for (const e of errors) {
    if (e.phase !== "opening" || !e.eco) continue;
    const fam = e.eco.slice(0, 2); // famiglia ECO (es. "B2")
    const list = byEco.get(fam) ?? [];
    list.push(e);
    byEco.set(fam, list);
  }
  for (const [fam, errs] of byEco) {
    push(
      build(
        `opening_eco_${fam}`,
        `Apertura ${fam}: esci male`,
        errs,
        (occ, gms) =>
          `${occ} errori in apertura nella famiglia ${fam} (${gms} partite). Costruisci o ripassa il repertorio.`,
        { label: "Repertorio", href: "/app/repertorio" },
      ),
    );
  }

  // Ordina per gravità e limita.
  return candidates.sort((a, b) => b.severity - a.severity).slice(0, 6);
}

// ============================================================
// Helper
// ============================================================

/** Costruisce un pattern se supera le soglie di ricorrenza; altrimenti null. */
function build(
  id: string,
  label: string,
  occ: ErrorMove[],
  describe: (occurrences: number, games: number, avgCp: number) => string,
  action: { label: string; href: string },
): WeaknessPattern | null {
  if (occ.length < MIN_OCCURRENCES) return null;
  const gameSet = new Set(occ.map((e) => e.gameId));
  if (gameSet.size < MIN_GAMES) return null;

  const totalLoss = occ.reduce((s, e) => s + e.cpLoss, 0);
  const avgCpLoss = totalLoss / occ.length;
  // Gravità: combina frequenza e perdita media, saturata a 1.
  const severity = Math.min(1, (occ.length / 12) * 0.6 + (avgCpLoss / 300) * 0.4);

  const examples = occ
    .slice()
    .sort((a, b) => b.cpLoss - a.cpLoss)
    .slice(0, 3)
    .map((e) => ({ gameId: e.gameId, ply: e.ply }));

  return {
    id,
    label,
    description: describe(occ.length, gameSet.size, avgCpLoss),
    severity,
    occurrences: occ.length,
    games: gameSet.size,
    avgCpLoss,
    examples,
    action,
  };
}

/** La SAN indica una mossa forzante: cattura (x), scacco (+/#) o promozione (=). */
function isForcing(san: string | null): boolean {
  if (!san) return false;
  return /[x+#]/.test(san) || san.includes("=");
}

/** Centipawn → pedoni con un decimale (es. 230 → "2.3"). */
function pawns(cp: number): string {
  return (cp / 100).toFixed(1);
}
