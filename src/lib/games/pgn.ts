/**
 * Parsing PGN con chess.js (unica autorità sulle regole).
 * Supporta uno o più giochi in un singolo testo e ne estrae i metadati per `games`.
 */

import { Chess } from "chess.js";
import type { PieceColor } from "./types";

export interface ParsedGame {
  pgn: string;
  white: string | null;
  black: string | null;
  result: string | null;
  ecoCode: string | null;
  /** ISO timestamp se ricavabile dagli header, altrimenti null. */
  playedAt: string | null;
  /** Id esterno per dedup (es. id partita Lichess dal tag Site). */
  externalId: string | null;
}

/** Valore "presente": scarta `?`, `????`, vuoti. */
function clean(v: string | null | undefined): string | null {
  if (!v) return null;
  const t = v.trim();
  if (!t || /^\?+$/.test(t)) return null;
  return t;
}

/** Divide un testo PGN multi-partita in singoli blocchi (split prima di ogni [Event). */
export function splitPgn(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  return trimmed
    .split(/(?=^\s*\[Event\b)/m)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** ISO timestamp dagli header (preferisce UTCDate/UTCTime, poi Date). */
function parsePlayedAt(h: Record<string, string | null>): string | null {
  const date = clean(h.UTCDate) ?? clean(h.Date);
  if (!date) return null;
  const [y, m, d] = date.split(".");
  if (!y || !m || !d || y.includes("?")) return null;
  const time = clean(h.UTCTime) ?? "00:00:00";
  const ms = Date.parse(`${y}-${m}-${d}T${time}Z`);
  return Number.isNaN(ms) ? null : new Date(ms).toISOString();
}

/** Estrae l'id partita da un URL (lichess.org/<id> o chess.com/.../<id>). */
function extractExternalId(site: string | null): string | null {
  const s = clean(site);
  if (!s) return null;
  const m = s.match(/(?:lichess\.org|chess\.com)\/(?:game\/(?:live\/)?)?([\w-]+)/i);
  return m ? m[1] : null;
}

/** Parsa un singolo PGN. Ritorna null se invalido o senza mosse. */
export function parseGame(pgn: string): ParsedGame | null {
  const chess = new Chess();
  try {
    chess.loadPgn(pgn);
  } catch {
    return null;
  }
  if (chess.history().length === 0) return null;

  const h = chess.header() as Record<string, string | null>;
  return {
    pgn: pgn.trim(),
    white: clean(h.White),
    black: clean(h.Black),
    result: clean(h.Result),
    ecoCode: clean(h.ECO),
    playedAt: parsePlayedAt(h),
    // Chess.com mette solo "Chess.com" nel tag Site; l'URL con id è nel tag Link.
    externalId: extractExternalId(h.Site) ?? extractExternalId(h.Link),
  };
}

/** Determina il colore dell'utente confrontando lo username coi tag White/Black. */
export function detectUserColor(
  game: ParsedGame,
  username: string | null,
): PieceColor | null {
  if (!username) return null;
  const u = username.toLowerCase();
  if (game.white?.toLowerCase() === u) return "white";
  if (game.black?.toLowerCase() === u) return "black";
  return null;
}
