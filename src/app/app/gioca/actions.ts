"use server";

import { Chess, type PieceSymbol } from "chess.js";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { findTimeControl } from "@/lib/play/time-controls";
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must sign in to play." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();
  const name = (profile?.display_name as string | null) ?? "Player";

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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must sign in to analyze a game." };

  if (!input.pgn.trim()) return { ok: false, error: "Empty game." };

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
      user_color: input.userColor,
      played_at: new Date().toISOString(),
      counts_for_profile: false,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/app/partite");
  return { ok: true, data: { id: data.id as string } };
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
  const uid = await getUserId();
  if (!uid) return { ok: false, error: "You must sign in." };

  const g = await loadGame(id);
  if (!g) return { ok: false, error: "Game not found." };
  if (g.status !== "ongoing") return { ok: false, error: "Game is not in progress." };

  const myColor =
    g.white_user_id === uid ? "w" : g.black_user_id === uid ? "b" : null;
  if (!myColor) return { ok: false, error: "You are not a player in this game." };
  if (g.turn !== myColor) return { ok: false, error: "It's not your turn." };

  const chess = new Chess(g.fen);
  let mv;
  try {
    mv = chess.move({ from, to, promotion: promotion as PieceSymbol | undefined });
  } catch {
    return { ok: false, error: "Illegal move." };
  }
  if (!mv) return { ok: false, error: "Illegal move." };

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
  const uid = await getUserId();
  if (!uid) return { ok: false, error: "You must sign in." };
  const g = await loadGame(id);
  if (!g) return { ok: false, error: "Game not found." };
  if (g.status !== "ongoing") return { ok: false, error: "Game is not in progress." };
  const myColor =
    g.white_user_id === uid ? "w" : g.black_user_id === uid ? "b" : null;
  if (!myColor) return { ok: false, error: "You are not a player." };

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
  const uid = await getUserId();
  if (!uid) return { ok: false, error: "You must sign in." };
  const g = await loadGame(id);
  if (!g) return { ok: false, error: "Game not found." };
  if (g.status !== "ongoing") return { ok: false, error: "Game is not in progress." };
  const myColor =
    g.white_user_id === uid ? "w" : g.black_user_id === uid ? "b" : null;
  if (!myColor) return { ok: false, error: "You are not a player." };

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
  const uid = await getUserId();
  if (!uid) return { ok: false, error: "You must sign in." };
  const g = await loadGame(id);
  if (!g) return { ok: false, error: "Game not found." };
  if (g.status !== "ongoing") return { ok: false, error: "Game is not in progress." };
  const myColor =
    g.white_user_id === uid ? "w" : g.black_user_id === uid ? "b" : null;
  if (!myColor) return { ok: false, error: "You are not a player." };

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
  const uid = await getUserId();
  if (!uid) return { ok: false, error: "You must sign in." };
  const g = await loadGame(id);
  if (!g) return { ok: false, error: "Game not found." };
  if (g.status !== "ongoing" || g.initial_ms == null) {
    return { ok: true, data: g };
  }
  if (g.white_user_id !== uid && g.black_user_id !== uid) {
    return { ok: false, error: "You are not a player." };
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
