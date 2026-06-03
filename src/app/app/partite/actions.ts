"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { splitPgn, parseGame, detectUserColor, type ParsedGame } from "@/lib/games/pgn";
import { lichessProvider, chesscomProvider, ProviderError } from "@/lib/games/providers";
import { CLASSIFICATION_ORDER } from "@/lib/games/types";
import type { AnalysisRowInput, Classification, GameSource } from "@/lib/games/types";
import { explainMove } from "@/lib/ai/coach";
import { isCoachConfigured } from "@/lib/ai/client";
import { evalText, phaseFromFen, moverFromPly } from "@/lib/ai/format";
import type { MoveFacts } from "@/lib/ai/types";
import { computeGameSignals, gameOutcomes } from "@/lib/rating/aggregate";
import { applyGameBatch } from "@/lib/rating/store";

export interface ImportResult {
  ok: boolean;
  imported?: number;
  skipped?: number;
  error?: string;
}

export interface ActionResult {
  ok: boolean;
  error?: string;
}

/** Inserisce le partite parsate, deduplicando su (user_id, source, external_id). */
async function importParsed(
  games: ParsedGame[],
  source: GameSource,
  username: string | null,
): Promise<ImportResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessione scaduta. Accedi di nuovo." };
  if (games.length === 0)
    return { ok: false, error: "Nessuna partita valida trovata nel PGN." };

  // Dedup contro le partite già presenti (solo per external_id noto).
  const extIds = games.map((g) => g.externalId).filter((x): x is string => !!x);
  const existing = new Set<string>();
  if (extIds.length > 0) {
    const { data } = await supabase
      .from("games")
      .select("external_id")
      .eq("user_id", user.id)
      .eq("source", source)
      .in("external_id", extIds);
    data?.forEach((r) => r.external_id && existing.add(r.external_id));
  }

  const seen = new Set<string>();
  const rows = [];
  let skipped = 0;
  for (const g of games) {
    if (g.externalId) {
      if (existing.has(g.externalId) || seen.has(g.externalId)) {
        skipped++;
        continue;
      }
      seen.add(g.externalId);
    }
    rows.push({
      user_id: user.id,
      source,
      external_id: g.externalId,
      pgn: g.pgn,
      white: g.white,
      black: g.black,
      result: g.result,
      eco_code: g.ecoCode,
      user_color: detectUserColor(g, username),
      played_at: g.playedAt,
    });
  }

  if (rows.length === 0) return { ok: true, imported: 0, skipped };

  const { error } = await supabase.from("games").insert(rows);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/app/partite");
  return { ok: true, imported: rows.length, skipped };
}

/** Limiti d'import: fermano file/incolla abnormi prima del parsing (costo CPU). */
const MAX_PGN_CHARS = 512_000; // ~500KB
const MAX_GAMES_PER_IMPORT = 200;

/** Import da PGN incollato o da file (.pgn letto come testo). */
export async function importPgnText(text: string): Promise<ImportResult> {
  if (!text.trim()) return { ok: false, error: "Incolla un PGN." };
  if (text.length > MAX_PGN_CHARS)
    return {
      ok: false,
      error: "PGN troppo grande (max ~500KB). Importa meno partite per volta.",
    };
  const games = splitPgn(text)
    .slice(0, MAX_GAMES_PER_IMPORT)
    .map(parseGame)
    .filter((g): g is ParsedGame => g !== null);
  return importParsed(games, "pgn", null);
}

/** Import delle ultime `max` partite pubbliche di un utente Lichess. */
export async function importLichess(
  username: string,
  max: number,
): Promise<ImportResult> {
  const u = username.trim();
  if (!u) return { ok: false, error: "Inserisci uno username Lichess." };
  const n = Math.max(1, Math.min(100, Math.floor(max) || 10));

  let pgnText: string;
  try {
    pgnText = await lichessProvider.fetchUserGamesPgn(u, n);
  } catch (e) {
    if (e instanceof ProviderError) return { ok: false, error: e.message };
    return { ok: false, error: "Errore imprevisto durante l'import da Lichess." };
  }

  const games = splitPgn(pgnText)
    .map(parseGame)
    .filter((g): g is ParsedGame => g !== null);
  return importParsed(games, "lichess", u);
}

/** Import delle ultime `max` partite pubbliche di un utente Chess.com. */
export async function importChesscom(
  username: string,
  max: number,
): Promise<ImportResult> {
  const u = username.trim();
  if (!u) return { ok: false, error: "Inserisci uno username Chess.com." };
  const n = Math.max(1, Math.min(100, Math.floor(max) || 10));

  let pgnText: string;
  try {
    pgnText = await chesscomProvider.fetchUserGamesPgn(u, n);
  } catch (e) {
    if (e instanceof ProviderError) return { ok: false, error: e.message };
    return { ok: false, error: "Errore imprevisto durante l'import da Chess.com." };
  }

  const games = splitPgn(pgnText)
    .map(parseGame)
    .filter((g): g is ParsedGame => g !== null);
  return importParsed(games, "chesscom", u);
}

const VALID_CLASSIFICATIONS: ReadonlySet<string> = new Set<string>(CLASSIFICATION_ORDER);

/** Ply già analizzati di una partita (per saltarli alla ripresa). RLS-scoped. */
export async function getSavedAnalysisPlies(gameId: string): Promise<number[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("game_analysis")
    .select("ply")
    .eq("game_id", gameId)
    .order("ply", { ascending: true });
  return (data ?? []).map((r) => r.ply as number);
}

/** Salva (upsert) un lotto di righe d'analisi. La RLS verifica la proprietà. */
export async function saveAnalysisChunk(
  gameId: string,
  rows: AnalysisRowInput[],
): Promise<ActionResult> {
  if (rows.length === 0) return { ok: true };
  const supabase = await createClient();
  // Sanifica i valori dal client: classification entro l'enum, stringhe limitate.
  const payload = rows.map((r) => ({
    game_id: gameId,
    ply: r.ply,
    san: typeof r.san === "string" ? r.san.slice(0, 16) : r.san,
    fen: typeof r.fen === "string" ? r.fen.slice(0, 100) : r.fen,
    eval_before: r.eval_before,
    eval_after: r.eval_after,
    best_move_san:
      typeof r.best_move_san === "string" ? r.best_move_san.slice(0, 16) : r.best_move_san,
    classification:
      r.classification && VALID_CLASSIFICATIONS.has(r.classification) ? r.classification : null,
  }));
  const { error } = await supabase
    .from("game_analysis")
    .upsert(payload, { onConflict: "game_id,ply" });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Marca la partita come analizzata (fine job) e alimenta il motore di rating. */
export async function finalizeGameAnalysis(gameId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("games")
    .update({ analyzed: true })
    .eq("id", gameId);
  if (error) return { ok: false, error: error.message };

  // Segnali di rating (domìni games + play_quality). Best-effort: un errore qui
  // NON deve far fallire la finalizzazione dell'analisi.
  await feedRatingFromGame(supabase, gameId).catch(() => {});

  revalidatePath("/app/partite");
  revalidatePath(`/app/partite/${gameId}`);
  return { ok: true };
}

/** Deriva ACPL + qualità di gioco dalle righe d'analisi e aggiorna il rating. */
async function feedRatingFromGame(
  supabase: Awaited<ReturnType<typeof createClient>>,
  gameId: string,
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: game } = await supabase
    .from("games")
    .select("user_color")
    .eq("id", gameId)
    .maybeSingle<{ user_color: "white" | "black" | null }>();
  if (!game?.user_color) return; // colore ignoto → non attribuibile

  const { data: rows } = await supabase
    .from("game_analysis")
    .select("ply, eval_before, eval_after")
    .eq("game_id", gameId);
  if (!rows || rows.length === 0) return;

  const signals = computeGameSignals(rows, game.user_color);
  const outcomes = gameOutcomes(signals);
  if (!outcomes) return; // troppe poche mosse dell'utente

  await applyGameBatch(supabase, user.id, {
    games: [outcomes.games],
    playQuality: [outcomes.playQuality],
  });
}

/** Cancella l'analisi esistente e riporta la partita a "da analizzare". */
export async function resetGameAnalysis(gameId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const del = await supabase.from("game_analysis").delete().eq("game_id", gameId);
  if (del.error) return { ok: false, error: del.error.message };
  const { error } = await supabase
    .from("games")
    .update({ analyzed: false })
    .eq("id", gameId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/app/partite");
  revalidatePath(`/app/partite/${gameId}`);
  return { ok: true };
}

export interface GenerateCommentsResult extends ActionResult {
  /** Numero di commenti effettivamente generati in questo batch. */
  generated?: number;
}

/** Posizione iniziale standard, "prima" del 1° semimosso. */
const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

/** Quante mosse-errore commentare al massimo in un singolo batch (controllo costi). */
const MAX_BATCH_COMMENTS = 12;

/**
 * Funzione A (batch) — genera il commento del coach SOLO per gli errori chiave
 * (blunder e mistake) ancora privi di `ai_comment`. Mai 80 chiamate automatiche:
 * solo gli errori principali, on-demand, e senza rigenerare ciò che esiste già.
 */
export async function generateKeyErrorComments(
  gameId: string,
): Promise<GenerateCommentsResult> {
  if (!isCoachConfigured())
    return { ok: false, error: "Il coach AI non è configurato." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessione scaduta. Accedi di nuovo." };

  // RLS garantisce che si vedano solo le righe delle proprie partite.
  const { data: rows, error } = await supabase
    .from("game_analysis")
    .select("ply, san, fen, eval_before, eval_after, best_move_san, classification, ai_comment")
    .eq("game_id", gameId)
    .order("ply", { ascending: true });
  if (error) return { ok: false, error: error.message };
  if (!rows || rows.length === 0) return { ok: true, generated: 0 };

  const fenByPly = new Map<number, string>();
  rows.forEach((r) => fenByPly.set(r.ply, r.fen));

  const { data: profile } = await supabase
    .from("profiles")
    .select("elo_estimate")
    .eq("id", user.id)
    .maybeSingle<{ elo_estimate: number | null }>();
  const elo = profile?.elo_estimate ?? null;

  const targets = rows
    .filter(
      (r) =>
        (r.classification === "blunder" ||
          r.classification === "miss" ||
          r.classification === "mistake") &&
        !(typeof r.ai_comment === "string" && r.ai_comment.trim()),
    )
    .slice(0, MAX_BATCH_COMMENTS);

  let generated = 0;
  for (const r of targets) {
    const fenBefore = r.ply > 1 ? fenByPly.get(r.ply - 1) ?? START_FEN : START_FEN;
    const facts: MoveFacts = {
      fenBefore,
      playedSan: r.san,
      classification: (r.classification as Classification | null) ?? null,
      bestMoveSan: r.best_move_san ?? null,
      evalBeforeText: evalText(r.eval_before),
      evalAfterText: evalText(r.eval_after),
      phase: phaseFromFen(fenBefore),
      mover: moverFromPly(r.ply),
    };
    try {
      const comment = await explainMove(facts, elo);
      if (!comment) continue;
      const { error: upErr } = await supabase
        .from("game_analysis")
        .update({ ai_comment: comment })
        .eq("game_id", gameId)
        .eq("ply", r.ply);
      if (upErr) return { ok: false, error: upErr.message, generated };
      generated++;
    } catch (e) {
      // Interrompi al primo errore API (rate limit/timeout): salva il parziale.
      const msg = e instanceof Error ? e.message : "Errore del coach AI.";
      return { ok: false, error: msg, generated };
    }
  }

  revalidatePath(`/app/partite/${gameId}`);
  return { ok: true, generated };
}

/** Elimina una partita (e, a cascata, la sua analisi). */
export async function deleteGame(gameId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("games").delete().eq("id", gameId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/app/partite");
  return { ok: true };
}
