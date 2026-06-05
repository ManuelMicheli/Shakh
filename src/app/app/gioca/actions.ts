"use server";

import { Chess, type PieceSymbol } from "chess.js";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { findTimeControl } from "@/lib/play/time-controls";
import { loadOverallRating, recordDomainOutcomes } from "@/lib/rating/store";
import { GLICKO_ANCHOR, RD_START } from "@/lib/rating/glicko2";
import type { FriendGameRow, FriendMove } from "@/lib/play/types";

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

async function getUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

async function loadGame(id: string): Promise<FriendGameRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("friend_games")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as FriendGameRow | null) ?? null;
}

/** Crea una partita online in attesa di un avversario. */
export async function createOnlineGame(input: {
  color: "w" | "b" | "random";
  timeControlId: string;
}): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient();
  const t = await getTranslations("play");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: t("error.signInToPlay") };

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();
  const name = (profile?.display_name as string | null) ?? t("defaultPlayer");

  const color: "w" | "b" =
    input.color === "random" ? (Math.random() < 0.5 ? "w" : "b") : input.color;
  const tc = findTimeControl(input.timeControlId);
  const start = new Chess().fen();

  const { data, error } = await supabase
    .from("friend_games")
    .insert({
      start_fen: start,
      fen: start,
      pgn: "",
      moves: [],
      turn: "w",
      status: "waiting",
      white_user_id: color === "w" ? user.id : null,
      black_user_id: color === "b" ? user.id : null,
      white_name: color === "w" ? name : null,
      black_name: color === "b" ? name : null,
      creator_color: color,
      initial_ms: tc.initialMs,
      increment_ms: tc.incMs,
      white_ms: tc.initialMs,
      black_ms: tc.initialMs,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/app/gioca");
  return { ok: true, data: { id: data.id as string } };
}

/**
 * Salva una partita appena giocata (sparring/hotseat/online) come riga `games`
 * così da poterla aprire nella schermata di analisi/review. NON incide sul
 * profilo (`counts_for_profile = false`): è materiale di studio su richiesta.
 * Restituisce l'id da aprire su `/app/partite/[id]`.
 */
export async function saveGameForReview(input: {
  pgn: string;
  white: string;
  black: string;
  /** "1-0" | "0-1" | "1/2-1/2" | "*" */
  result: string;
  userColor: "w" | "b";
}): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient();
  const t = await getTranslations("play");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: t("error.signInToAnalyze") };

  if (!input.pgn.trim()) return { ok: false, error: t("error.emptyGame") };

  const { data, error } = await supabase
    .from("games")
    .insert({
      user_id: user.id,
      source: "pgn",
      external_id: null,
      pgn: input.pgn,
      white: input.white,
      black: input.black,
      result: input.result,
      eco_code: null,
      user_color: input.userColor === "w" ? "white" : "black",
      played_at: new Date().toISOString(),
      counts_for_profile: false,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/app/partite");
  return { ok: true, data: { id: data.id as string } };
}

/**
 * Matchmaking: entra in coda per un controllo di tempo e prova ad accoppiarti.
 * `band` è la tolleranza di rating (allargata dal client col passare dell'attesa).
 * Ritorna `{ gameId }` con l'id della partita se accoppiato, `null` se in attesa.
 */
export async function enqueueMatch(input: {
  timeControlId: string;
  band: number;
}): Promise<ActionResult<{ gameId: string | null }>> {
  const supabase = await createClient();
  const t = await getTranslations("play");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: t("error.signInToPlay") };

  const overall = await loadOverallRating(supabase, user.id);
  const rating = overall?.rating ?? GLICKO_ANCHOR;
  const rd = overall?.rd ?? RD_START;
  const tc = findTimeControl(input.timeControlId);

  const { data, error } = await supabase.rpc("mm_enqueue", {
    p_tc: tc.id,
    p_initial_ms: tc.initialMs,
    p_inc_ms: tc.incMs,
    p_rating: rating,
    p_rd: rd,
    p_band: input.band,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: { gameId: (data as string | null) ?? null } };
}

/** Esci dalla coda di matchmaking. */
export async function cancelMatch(): Promise<ActionResult<null>> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("mm_cancel");
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: null };
}

/**
 * Applica l'aggiornamento di rating per la partita online finita, SOLO per il
 * proprio lato (RLS: ogni utente scrive le proprie righe `user_ratings`). Usa lo
 * snapshot del rating avversario fissato all'accoppiamento. Idempotente via la
 * guardia `*_rated_at`. Chiamata da entrambi i client a fine partita.
 */
export type RatingChange = { rating: number; delta: number | null } | null;

export async function rateOnlineGame(
  id: string,
): Promise<ActionResult<RatingChange>> {
  const supabase = await createClient();
  const uid = await getUserId();
  if (!uid) return { ok: true, data: null };

  const g = await loadGame(id);
  if (!g || !g.rated || g.status !== "finished") return { ok: true, data: null };

  // Se è una partita di Campionato, registra l'esito in classifica (idempotente,
  // no-op per le partite non-campionato). Best-effort: non blocca il rating.
  await supabase.rpc("champ_score", { p_friend_game_id: id });

  const myColor =
    g.white_user_id === uid ? "w" : g.black_user_id === uid ? "b" : null;
  if (!myColor) return { ok: true, data: null };

  // Già valutato per il mio lato → restituisci comunque il rating attuale (così
  // l'overlay può mostrarlo dopo un refresh), ma senza delta.
  if (myColor === "w" ? g.white_rated_at : g.black_rated_at) {
    const after = await loadOverallRating(supabase, uid);
    return {
      ok: true,
      data: after?.rating != null ? { rating: Math.round(after.rating), delta: null } : null,
    };
  }

  // Punteggio dal mio punto di vista (1 vittoria, 0.5 patta, 0 sconfitta).
  let score: number;
  if (g.result === "1/2-1/2") score = 0.5;
  else if (g.result === "1-0") score = myColor === "w" ? 1 : 0;
  else if (g.result === "0-1") score = myColor === "b" ? 1 : 0;
  else return { ok: true, data: null }; // risultato non rateabile

  const opponentRating =
    (myColor === "w" ? g.black_rating : g.white_rating) ?? GLICKO_ANCHOR;
  const opponentRd =
    (myColor === "w" ? g.black_rd : g.white_rd) ?? RD_START;

  const before = await loadOverallRating(supabase, uid);

  await recordDomainOutcomes(
    supabase,
    uid,
    "games",
    [{ opponentRating, opponentRd, score }],
    "online_game",
  );

  const stamp = myColor === "w" ? "white_rated_at" : "black_rated_at";
  await supabase
    .from("friend_games")
    .update({ [stamp]: new Date().toISOString() })
    .eq("id", id);

  const after = await loadOverallRating(supabase, uid);
  if (after?.rating == null) return { ok: true, data: null };
  const delta =
    before?.rating != null ? Math.round(after.rating - before.rating) : null;
  return { ok: true, data: { rating: Math.round(after.rating), delta } };
}

/** Unisciti come avversario a una partita in attesa (via funzione SECURITY DEFINER). */
export async function joinOnlineGame(
  id: string,
): Promise<ActionResult<FriendGameRow>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("friend_game_join", { p_id: id });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/app/gioca/${id}`);
  return { ok: true, data: data as FriendGameRow };
}

/** Esegue una mossa (validata col motore delle regole) gestendo l'orologio. */
export async function makeOnlineMove(
  id: string,
  from: string,
  to: string,
  promotion?: string,
): Promise<ActionResult<FriendGameRow>> {
  const supabase = await createClient();
  const t = await getTranslations("play");
  const uid = await getUserId();
  if (!uid) return { ok: false, error: t("error.signIn") };

  const g = await loadGame(id);
  if (!g) return { ok: false, error: t("error.gameNotFound") };
  if (g.status !== "ongoing") return { ok: false, error: t("error.notInProgress") };

  const myColor =
    g.white_user_id === uid ? "w" : g.black_user_id === uid ? "b" : null;
  if (!myColor) return { ok: false, error: t("error.notPlayerInGame") };
  if (g.turn !== myColor) return { ok: false, error: t("error.notYourTurn") };

  const chess = new Chess(g.fen);
  let mv;
  try {
    mv = chess.move({ from, to, promotion: promotion as PieceSymbol | undefined });
  } catch {
    return { ok: false, error: t("error.illegalMove") };
  }
  if (!mv) return { ok: false, error: t("error.illegalMove") };

  const now = Date.now();
  let white_ms = g.white_ms;
  let black_ms = g.black_ms;

  // Orologio: scala il tempo del giocatore che muove e applica l'incremento.
  if (g.initial_ms != null) {
    const last = g.last_move_at ? Date.parse(g.last_move_at) : now;
    const elapsed = Math.max(0, now - last);
    const before = (myColor === "w" ? g.white_ms : g.black_ms) ?? 0;
    const remaining = before - elapsed;
    if (remaining <= 0) {
      // Bandiera caduta: chi doveva muovere perde. La mossa non viene applicata.
      const result = myColor === "w" ? "0-1" : "1-0";
      if (myColor === "w") white_ms = 0;
      else black_ms = 0;
      const { data, error } = await supabase
        .from("friend_games")
        .update({ status: "finished", result, end_reason: "timeout", white_ms, black_ms })
        .eq("id", id)
        .select("*")
        .single();
      if (error) return { ok: false, error: error.message };
      revalidatePath(`/app/gioca/${id}`);
      return { ok: true, data: data as FriendGameRow };
    }
    const after = remaining + g.increment_ms;
    if (myColor === "w") white_ms = after;
    else black_ms = after;
  }

  const moves: FriendMove[] = [
    ...g.moves,
    { san: mv.san, from: mv.from, to: mv.to, promotion: mv.promotion, fen: mv.after },
  ];

  // PGN completo ricostruito dalla posizione iniziale.
  const full = new Chess(g.start_fen);
  for (const m of moves) full.move({ from: m.from, to: m.to, promotion: m.promotion });
  const pgn = full.pgn();

  let status: FriendGameRow["status"] = "ongoing";
  let result: string | null = null;
  let end_reason: string | null = null;
  if (chess.isCheckmate()) {
    status = "finished";
    result = myColor === "w" ? "1-0" : "0-1";
    end_reason = "checkmate";
  } else if (chess.isStalemate()) {
    status = "finished";
    result = "1/2-1/2";
    end_reason = "stalemate";
  } else if (chess.isInsufficientMaterial() || chess.isDraw()) {
    status = "finished";
    result = "1/2-1/2";
    end_reason = "draw";
  }

  const { data, error } = await supabase
    .from("friend_games")
    .update({
      fen: mv.after,
      pgn,
      moves,
      turn: chess.turn(),
      status,
      result,
      end_reason,
      white_ms,
      black_ms,
      last_move_at: new Date(now).toISOString(),
      draw_offer_by: null,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/app/gioca/${id}`);
  return { ok: true, data: data as FriendGameRow };
}

/** Abbandona: chi chiama perde. */
export async function resignOnlineGame(
  id: string,
): Promise<ActionResult<FriendGameRow>> {
  const supabase = await createClient();
  const t = await getTranslations("play");
  const uid = await getUserId();
  if (!uid) return { ok: false, error: t("error.signIn") };
  const g = await loadGame(id);
  if (!g) return { ok: false, error: t("error.gameNotFound") };
  if (g.status !== "ongoing") return { ok: false, error: t("error.notInProgress") };
  const myColor =
    g.white_user_id === uid ? "w" : g.black_user_id === uid ? "b" : null;
  if (!myColor) return { ok: false, error: t("error.notPlayer") };

  const result = myColor === "w" ? "0-1" : "1-0";
  const { data, error } = await supabase
    .from("friend_games")
    .update({ status: "finished", result, end_reason: "resign" })
    .eq("id", id)
    .select("*")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/app/gioca/${id}`);
  return { ok: true, data: data as FriendGameRow };
}

/** Propone patta (o revoca chiamando con la stessa proposta già attiva). */
export async function offerDrawOnline(
  id: string,
): Promise<ActionResult<FriendGameRow>> {
  const supabase = await createClient();
  const t = await getTranslations("play");
  const uid = await getUserId();
  if (!uid) return { ok: false, error: t("error.signIn") };
  const g = await loadGame(id);
  if (!g) return { ok: false, error: t("error.gameNotFound") };
  if (g.status !== "ongoing") return { ok: false, error: t("error.notInProgress") };
  const myColor =
    g.white_user_id === uid ? "w" : g.black_user_id === uid ? "b" : null;
  if (!myColor) return { ok: false, error: t("error.notPlayer") };

  const { data, error } = await supabase
    .from("friend_games")
    .update({ draw_offer_by: myColor })
    .eq("id", id)
    .select("*")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/app/gioca/${id}`);
  return { ok: true, data: data as FriendGameRow };
}

/** Risponde a una proposta di patta dell'avversario. */
export async function respondDrawOnline(
  id: string,
  accept: boolean,
): Promise<ActionResult<FriendGameRow>> {
  const supabase = await createClient();
  const t = await getTranslations("play");
  const uid = await getUserId();
  if (!uid) return { ok: false, error: t("error.signIn") };
  const g = await loadGame(id);
  if (!g) return { ok: false, error: t("error.gameNotFound") };
  if (g.status !== "ongoing") return { ok: false, error: t("error.notInProgress") };
  const myColor =
    g.white_user_id === uid ? "w" : g.black_user_id === uid ? "b" : null;
  if (!myColor) return { ok: false, error: t("error.notPlayer") };

  if (accept && g.draw_offer_by && g.draw_offer_by !== myColor) {
    const { data, error } = await supabase
      .from("friend_games")
      .update({
        status: "finished",
        result: "1/2-1/2",
        end_reason: "agreement",
        draw_offer_by: null,
      })
      .eq("id", id)
      .select("*")
      .single();
    if (error) return { ok: false, error: error.message };
    revalidatePath(`/app/gioca/${id}`);
    return { ok: true, data: data as FriendGameRow };
  }

  // rifiuto / annullo
  const { data, error } = await supabase
    .from("friend_games")
    .update({ draw_offer_by: null })
    .eq("id", id)
    .select("*")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/app/gioca/${id}`);
  return { ok: true, data: data as FriendGameRow };
}

/**
 * Reclama la vittoria per tempo scaduto dell'avversario. Chiamabile da
 * entrambi i client: il server verifica che il tempo del lato al tratto sia
 * davvero esaurito (no-op altrimenti).
 */
export async function claimTimeoutOnline(
  id: string,
): Promise<ActionResult<FriendGameRow>> {
  const supabase = await createClient();
  const t = await getTranslations("play");
  const uid = await getUserId();
  if (!uid) return { ok: false, error: t("error.signIn") };
  const g = await loadGame(id);
  if (!g) return { ok: false, error: t("error.gameNotFound") };
  if (g.status !== "ongoing" || g.initial_ms == null) {
    return { ok: true, data: g };
  }
  if (g.white_user_id !== uid && g.black_user_id !== uid) {
    return { ok: false, error: t("error.notPlayer") };
  }

  const mover = g.turn;
  const last = g.last_move_at ? Date.parse(g.last_move_at) : Date.now();
  const elapsed = Math.max(0, Date.now() - last);
  const before = (mover === "w" ? g.white_ms : g.black_ms) ?? 0;
  if (before - elapsed > 0) {
    return { ok: true, data: g }; // tempo non ancora scaduto
  }

  const result = mover === "w" ? "0-1" : "1-0";
  const patch: Record<string, unknown> = {
    status: "finished",
    result,
    end_reason: "timeout",
  };
  if (mover === "w") patch.white_ms = 0;
  else patch.black_ms = 0;

  const { data, error } = await supabase
    .from("friend_games")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/app/gioca/${id}`);
  return { ok: true, data: data as FriendGameRow };
}
