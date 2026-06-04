"use server";

import { splitPgn, parseGame, detectUserColor } from "@/lib/games/pgn";
import { lichessProvider, chesscomProvider, ProviderError } from "@/lib/games/providers";
import { buildScoutReport, type ScoutEntry, type ScoutReport } from "@/lib/prep/scout";
import type { GameSource } from "@/lib/games/types";

const MAX_GAMES = 150;

export interface ScoutInput {
  username: string;
  source: "lichess" | "chesscom";
}

export interface ScoutResult {
  ok: boolean;
  error?: string;
  report?: ScoutReport;
  username?: string;
}

/** Punteggio dal punto di vista dell'avversario, dato il colore e il risultato. */
function opponentScore(result: string | null, color: "white" | "black"): number | null {
  if (result === "1/2-1/2") return 0.5;
  if (result === "1-0") return color === "white" ? 1 : 0;
  if (result === "0-1") return color === "black" ? 1 : 0;
  return null; // partita non conclusa / risultato ignoto
}

/**
 * Scouting di un avversario: scarica le sue partite pubbliche e costruisce un
 * report delle aperture per colore e dei punti deboli. Dati pubblici, fetch
 * lato server.
 */
export async function scoutOpponent(input: ScoutInput): Promise<ScoutResult> {
  const username = input.username.trim();
  if (!username || username.length > 40) {
    return { ok: false, error: "Enter a valid username." };
  }
  const provider: Record<GameSource, typeof lichessProvider | null> = {
    pgn: null,
    lichess: lichessProvider,
    chesscom: chesscomProvider,
  };
  const p = provider[input.source];
  if (!p) return { ok: false, error: "Unsupported source." };

  let pgnText: string;
  try {
    pgnText = await p.fetchUserGamesPgn(username, MAX_GAMES);
  } catch (e) {
    if (e instanceof ProviderError) return { ok: false, error: e.message };
    return { ok: false, error: "Unexpected error contacting the platform." };
  }

  const blocks = splitPgn(pgnText);
  const entries: ScoutEntry[] = [];
  for (const block of blocks) {
    const game = parseGame(block);
    if (!game) continue;
    const color = detectUserColor(game, username);
    if (!color) continue;
    const score = opponentScore(game.result, color);
    if (score == null) continue;
    entries.push({
      color,
      key: game.opening ?? game.ecoCode ?? "Unknown opening",
      eco: game.ecoCode,
      score,
    });
  }

  if (entries.length === 0) {
    return { ok: false, error: "No finished games found for this username." };
  }

  return { ok: true, report: buildScoutReport(entries), username };
}
