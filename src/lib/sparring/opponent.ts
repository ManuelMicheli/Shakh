/**
 * Avversario-motore con PERSONALITÀ e forza limitata (Fase 7).
 *
 * Stockfish "lite" non espone uno Skill Level nel nostro wrapper, quindi la
 * forza è limitata via profondità ridotta + probabilità di scegliere una mossa
 * (ragionevole) non ottimale fra le linee multiPV. Lo stile pondera quale fra
 * le linee candidate preferire.
 *
 * Modulo PURO: nessun motore, nessun DB. Riceve le linee già calcolate dal
 * wrapper (`EngineLine[]`) e la FEN, e sceglie una mossa UCI. `chess.js` solo
 * per sapere se una candidata è cattura/scacco.
 */
import { Chess, type Square, type PieceSymbol } from "chess.js";

export type Style = "aggressive" | "positional" | "drawish";

/** Linea multiPV minima necessaria alla scelta. */
export interface CandidateLine {
  multipv: number;
  scoreType: "cp" | "mate";
  score: number;
  pv: string[];
}

export interface Strength {
  /** Profondità di ricerca del motore. */
  depth: number;
  /** Probabilità di giocare una mossa non ottimale (fra le candidate ragionevoli). */
  weakProb: number;
}

/** Mappa un Elo bersaglio a profondità + rumore. Più basso → più debole e impreciso. */
export function strengthFor(targetElo: number): Strength {
  if (targetElo < 1000) return { depth: 4, weakProb: 0.5 };
  if (targetElo < 1400) return { depth: 6, weakProb: 0.34 };
  if (targetElo < 1800) return { depth: 8, weakProb: 0.2 };
  if (targetElo < 2200) return { depth: 10, weakProb: 0.08 };
  return { depth: 12, weakProb: 0.02 };
}

/** Punteggio in centipawn dal punto di vista del motore (matto = valore grande con segno). */
function cpOf(l: CandidateLine): number {
  if (l.scoreType === "mate") return l.score > 0 ? 100000 - l.score : -100000 - l.score;
  return l.score;
}

/** La mossa UCI è cattura o dà scacco nella posizione data. */
function isSharp(fen: string, uci: string): boolean {
  try {
    const c = new Chess(fen);
    const m = c.move({
      from: uci.slice(0, 2) as Square,
      to: uci.slice(2, 4) as Square,
      promotion: uci.length > 4 ? (uci[4] as PieceSymbol) : undefined,
    });
    return Boolean(m.captured) || m.san.includes("+") || m.san.includes("#");
  } catch {
    return false;
  }
}

/**
 * Sceglie la mossa UCI del motore secondo stile e forza.
 * `rng` iniettabile (default Math.random) per testabilità.
 */
export function chooseEngineMove(
  fen: string,
  lines: CandidateLine[],
  style: Style,
  strength: Strength,
  rng: () => number = Math.random,
): string | null {
  const valid = lines.filter((l) => l.pv.length > 0).sort((a, b) => a.multipv - b.multipv);
  if (valid.length === 0) return null;
  const best = valid[0];

  // Cap di forza: a volte gioca una candidata peggiore (ma comunque fra le top multiPV).
  if (valid.length > 1 && rng() < strength.weakProb) {
    const alts = valid.slice(1, 4);
    return alts[Math.floor(rng() * alts.length)].pv[0];
  }

  const bestCp = cpOf(best);

  if (style === "aggressive") {
    // Fra le candidate entro 60cp dalla migliore, preferisci catture/scacchi.
    const near = valid.filter((l) => bestCp - cpOf(l) <= 60);
    const sharp = near.find((l) => isSharp(fen, l.pv[0]));
    return (sharp ?? best).pv[0];
  }

  if (style === "drawish") {
    // Preferisci la candidata con valutazione più vicina alla parità, senza perdere.
    const notLosing = valid.filter((l) => cpOf(l) >= -40);
    const pool = notLosing.length ? notLosing : valid;
    const calm = pool.reduce((a, b) => (Math.abs(cpOf(a)) <= Math.abs(cpOf(b)) ? a : b));
    return calm.pv[0];
  }

  // positional: gioca semplicemente la migliore.
  return best.pv[0];
}

export const STYLE_LABEL: Record<Style, string> = {
  aggressive: "Aggressivo",
  positional: "Posizionale",
  drawish: "Solido",
};
