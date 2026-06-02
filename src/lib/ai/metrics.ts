/**
 * Metriche deterministiche dei pattern d'errore (prompt 04 §5, parte dati).
 * NESSUNA AI qui: aggrega solo le classificazioni già calcolate dal motore.
 */

import { phaseFromFen, moverFromPly } from "./format";
import type { GamePhase, PhaseStats, UserMetrics } from "./types";
import type { Classification, PieceColor } from "@/lib/games/types";

export interface MetricGame {
  id: string;
  user_color: PieceColor | null;
}

export interface MetricRow {
  game_id: string;
  ply: number;
  fen: string;
  classification: Classification | null;
}

const PHASES: GamePhase[] = ["opening", "middlegame", "endgame"];

/** Aggrega le righe d'analisi nelle metriche per fase, solo per le mosse dell'utente. */
export function computeMetrics(games: MetricGame[], rows: MetricRow[]): UserMetrics {
  const colorByGame = new Map<string, PieceColor | null>();
  games.forEach((g) => colorByGame.set(g.id, g.user_color));

  const acc: Record<GamePhase, PhaseStats> = {
    opening: phaseInit("opening"),
    middlegame: phaseInit("middlegame"),
    endgame: phaseInit("endgame"),
  };

  let userMoves = 0;
  let inaccuracies = 0;
  let mistakes = 0;
  let blunders = 0;
  const gamesWithData = new Set<string>();

  for (const r of rows) {
    const color = colorByGame.get(r.game_id);
    if (!color) continue; // colore ignoto: non attribuibile
    if (moverFromPly(r.ply) !== color) continue; // mossa dell'avversario

    userMoves++;
    gamesWithData.add(r.game_id);
    const phase = phaseFromFen(r.fen);
    const s = acc[phase];
    s.moves++;
    if (r.classification === "inaccuracy") {
      s.inaccuracies++;
      inaccuracies++;
    } else if (r.classification === "mistake") {
      s.mistakes++;
      mistakes++;
    } else if (r.classification === "blunder") {
      s.blunders++;
      blunders++;
    }
  }

  const byPhase = PHASES.map((p) => {
    const s = acc[p];
    const errors = s.inaccuracies + s.mistakes + s.blunders;
    s.score = s.moves > 0 ? Math.max(0, 1 - errors / s.moves) : 0;
    return s;
  });

  // Fase peggiore: score più basso fra quelle con abbastanza dati (≥ 3 mosse).
  let worstPhase: GamePhase | null = null;
  let worstScore = Infinity;
  for (const s of byPhase) {
    if (s.moves >= 3 && s.score < worstScore) {
      worstScore = s.score;
      worstPhase = s.phase;
    }
  }

  return {
    games: gamesWithData.size,
    userMoves,
    byPhase,
    worstPhase,
    inaccuracies,
    mistakes,
    blunders,
  };
}

function phaseInit(phase: GamePhase): PhaseStats {
  return { phase, moves: 0, inaccuracies: 0, mistakes: 0, blunders: 0, score: 0 };
}
