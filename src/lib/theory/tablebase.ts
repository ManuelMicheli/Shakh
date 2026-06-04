/**
 * Tablebase di Lichess (Syzygy) — la VERITÀ ASSOLUTA nei finali con ≤7 pezzi.
 * Niente approssimazione del motore: esito esatto (vittoria/patta/sconfitta),
 * distanza al matto/alla conversione (DTM/DTZ) e, per ogni mossa legale, il suo
 * esito esatto.
 *
 *   GET https://tablebase.lichess.ovh/standard?fen=…
 *
 * Cache per FEN; fallback pulito se la posizione ha troppi pezzi (l'UI ripiega
 * sulla valutazione del motore del prompt 02).
 */

import type { Locale } from "@/i18n/config";

export type TbCategory =
  | "win"
  | "cursed-win"
  | "maybe-win"
  | "draw"
  | "blessed-loss"
  | "maybe-loss"
  | "loss"
  | "unknown";

export interface TablebaseMove {
  uci: string;
  san: string;
  /** Categoria DAL PUNTO DI VISTA di chi muove DOPO la mossa (come da API). */
  category: TbCategory;
  dtz: number | null;
  dtm: number | null;
  zeroing: boolean;
  checkmate: boolean;
  stalemate: boolean;
}

export interface TablebaseData {
  category: TbCategory;
  dtz: number | null;
  dtm: number | null;
  checkmate: boolean;
  stalemate: boolean;
  /** Mosse legali, già ordinate dall'API dalla migliore alla peggiore. */
  moves: TablebaseMove[];
}

export type TablebaseResult =
  | { ok: true; data: TablebaseData }
  | { ok: false; error: string; tooManyPieces?: boolean; rateLimited?: boolean };

const URL = "https://tablebase.lichess.ovh/standard";
const MAX_PIECES = 7;

const cache = new Map<string, TablebaseData>();
const inflight = new Map<string, Promise<TablebaseResult>>();

/** Conta i pezzi sulla scacchiera leggendo il campo posizione della FEN. */
export function countPieces(fen: string): number {
  const board = fen.split(" ")[0] ?? "";
  let count = 0;
  for (const ch of board) {
    if (/[pnbrqkPNBRQK]/.test(ch)) count++;
  }
  return count;
}

export function isTablebaseEligible(fen: string): boolean {
  return countPieces(fen) <= MAX_PIECES;
}

/**
 * Interroga la tablebase. Risultato (dati) cachato per FEN.
 * `locale` opzionale: omesso → messaggi d'errore in inglese (retrocompatibile).
 */
export async function fetchTablebase(fen: string, locale: Locale = "en"): Promise<TablebaseResult> {
  const it = locale === "it";
  if (!isTablebaseEligible(fen)) {
    return {
      ok: false,
      error: it
        ? "Posizione con più di 7 pezzi: fuori dalla tablebase."
        : "Position with more than 7 pieces: outside the tablebase.",
      tooManyPieces: true,
    };
  }

  const cached = cache.get(fen);
  if (cached) return { ok: true, data: cached };

  const pending = inflight.get(fen);
  if (pending) return pending;

  const promise: Promise<TablebaseResult> = (async () => {
    let res: Response;
    try {
      res = await fetch(`${URL}?fen=${encodeURIComponent(fen)}`, {
        headers: { Accept: "application/json" },
      });
    } catch {
      return {
        ok: false,
        error: it ? "Errore di rete nel contattare la tablebase." : "Network error contacting the tablebase.",
      };
    }
    if (res.status === 429) {
      return {
        ok: false,
        error: it
          ? "Troppe richieste alla tablebase. Riprova tra poco."
          : "Too many requests to the tablebase. Try again shortly.",
        rateLimited: true,
      };
    }
    if (!res.ok) {
      return {
        ok: false,
        error: it
          ? `La tablebase ha risposto con stato ${res.status}.`
          : `The tablebase responded with status ${res.status}.`,
      };
    }
    let raw: TablebaseData;
    try {
      raw = (await res.json()) as TablebaseData;
    } catch {
      return {
        ok: false,
        error: it ? "Risposta della tablebase non valida." : "Invalid tablebase response.",
      };
    }
    const data: TablebaseData = {
      category: raw.category ?? "unknown",
      dtz: raw.dtz ?? null,
      dtm: raw.dtm ?? null,
      checkmate: raw.checkmate ?? false,
      stalemate: raw.stalemate ?? false,
      moves: (raw.moves ?? []).map((m) => ({
        uci: m.uci,
        san: m.san,
        category: m.category ?? "unknown",
        dtz: m.dtz ?? null,
        dtm: m.dtm ?? null,
        zeroing: m.zeroing ?? false,
        checkmate: m.checkmate ?? false,
        stalemate: m.stalemate ?? false,
      })),
    };
    cache.set(fen, data);
    return { ok: true, data };
  })();

  inflight.set(fen, promise);
  try {
    return await promise;
  } finally {
    inflight.delete(fen);
  }
}

/**
 * La categoria di una MOSSA è quella della posizione risultante, vista da chi
 * muoverà dopo: quindi "loss" (per l'avversario) = mossa VINCENTE per noi.
 * Qui la traduciamo nell'esito per chi muove ORA.
 */
export type MoveQuality = "win" | "draw" | "loss" | "unknown";

export function moveQuality(category: TbCategory): MoveQuality {
  switch (category) {
    case "loss":
    case "maybe-loss":
    case "blessed-loss":
      return "win"; // l'avversario perde → noi vinciamo
    case "win":
    case "maybe-win":
    case "cursed-win":
      return "loss"; // l'avversario vince → noi perdiamo
    case "draw":
      return "draw";
    default:
      return "unknown";
  }
}
