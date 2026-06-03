/**
 * Aggregazione multi-segnale del "Rating Shakh".
 *
 * Cinque domìni, ciascuno con un proprio stato Glicko-2 su scala Elo OTB:
 *   tactic        — performance sui puzzle (vs forza calibrata, calibration.ts)
 *   games         — performance sulle partite reali (perf-rating da ACPL)
 *   endgame       — conversione dei finali teorici vs miglior difesa (Fase 3)
 *   calculation   — profondità di calcolo nel trainer dedicato (Fase 4)
 *   play_quality  — qualità/coordinazione del gioco (oltre il conteggio errori)
 *
 * Il rating COMPLESSIVO è una media pesata per precisione (inverse-variance):
 * più un dominio è certo (RD bassa) più pesa, modulato da un priore per dominio.
 * Il risultato è poi limitato dal tetto anti-inflazione (`ceiling.ts`).
 *
 * Modulo PURO. Le derivazioni dei segnali partita usano i decoder esistenti
 * di `evalScore.ts` e l'attribuzione mossa↔colore di `ai/format.ts`.
 */

import { decodeEval, toMoverCp } from "@/lib/analysis/evalScore";
import { moverFromPly } from "@/lib/ai/format";
import {
  GLICKO_ANCHOR,
  RD_FLOOR,
  SCALE,
  type Glicko2State,
  type MatchOutcome,
} from "./glicko2";

export type RatingDomain =
  | "tactic"
  | "games"
  | "endgame"
  | "calculation"
  | "play_quality"
  | "external";

/** Stato di un dominio + numerosità del campione che lo ha prodotto. */
export interface DomainRating {
  domain: RatingDomain;
  state: Glicko2State;
  samples: number;
}

/**
 * Priore per dominio: quanto direttamente misura la forza reale.
 * `external` (account online collegato) è il segnale più diretto di forza reale
 * a tavolino una volta deflazionato → priore alto: pesa MOLTO nell'aggregato.
 */
export const DOMAIN_PRIOR: Record<RatingDomain, number> = {
  external: 1.6,
  tactic: 1.0,
  games: 1.0,
  play_quality: 0.8,
  endgame: 0.7,
  calculation: 0.6,
};

/** Etichette italiane per la UI. */
export const DOMAIN_LABEL: Record<RatingDomain, string> = {
  tactic: "Tattica",
  games: "Partite",
  endgame: "Finali",
  calculation: "Calcolo",
  play_quality: "Qualità di gioco",
  external: "Account online",
};

// ============================================================
// Segnale account online (rating Lichess / Chess.com collegato)
// ============================================================

/**
 * RD da attribuire al dominio 'external' in base al numero di partite valutate
 * dietro al rating online: più partite → stima più certa → RD più bassa → pesa
 * di più. Limitata fra un pavimento (un rating online resta una stima) e un
 * tetto (pochi giochi = poca fiducia).
 */
export const EXTERNAL_RD_FLOOR = 45;
export const EXTERNAL_RD_CEIL = 110;

export function externalRdFromGames(nGames: number): number {
  const rd = 600 / Math.sqrt(Math.max(1, nGames) + 10);
  return Math.round(Math.max(EXTERNAL_RD_FLOOR, Math.min(EXTERNAL_RD_CEIL, rd)));
}

/** Campioni "equivalenti" attribuiti al dominio external (cap: non deve dominare i conteggi). */
export const EXTERNAL_MAX_SAMPLES = 50;

/** RD oltre la quale il rating complessivo è "non calibrato". */
export const PROVISIONAL_RD_THRESHOLD = 110;
/** Campioni totali sotto i quali il rating resta "non calibrato". */
export const MIN_TOTAL_SAMPLES = 20;
/** RD attribuita a una singola partita analizzata (campione discreto ma rumoroso). */
export const GAME_OPP_RD = 80;
/** Mosse minime dell'utente perché una partita produca un segnale di rating. */
export const MIN_GAME_MOVES = 8;
/** Tetto per la perdita di centipawn della singola mossa (un blunder non distrugge la stima). */
export const MAX_MOVE_LOSS = 1000;

// ============================================================
// Perf-rating da ACPL
// ============================================================

/**
 * Relazione ACPL→Elo OTB, APPROSSIMATA e tarabile:
 *   rating ≈ A − B·ln(acpl + C)
 * Tarata su: ACPL 20≈2000, 50≈1500, 100≈1050, 150≈790.
 */
export const ACPL_MODEL = { A: 4453, B: 721, C: 10, min: 400, max: 2900 } as const;

export function perfRatingFromAcpl(acpl: number): number {
  const { A, B, C, min, max } = ACPL_MODEL;
  const r = A - B * Math.log(Math.max(0, acpl) + C);
  return Math.round(Math.max(min, Math.min(max, r)));
}

// ============================================================
// Derivazione dei segnali da game_analysis
// ============================================================

/** Riga d'analisi minima necessaria al calcolo dei segnali partita. */
export interface AnalysisEvalRow {
  ply: number;
  eval_before: number | null;
  eval_after: number | null;
}

export interface GameSignals {
  userMoves: number;
  /** ACPL grezzo sulle mosse dell'utente. */
  acpl: number;
  /** ACPL pesato: penalizza di più gli errori commessi da posizione favorevole. */
  weightedAcpl: number;
}

/**
 * Calcola ACPL grezzo e pesato sulle sole mosse dell'utente.
 * La perdita di una mossa è `moverCp(prima) − moverCp(dopo)`, ≥0 e limitata.
 * Peso: 1.3 se la posizione era favorevole/pari (sprecare è grave), 0.5 se già
 * persa (poco informativa), 1.0 altrimenti.
 */
export function computeGameSignals(
  rows: AnalysisEvalRow[],
  userColor: "white" | "black",
): GameSignals {
  let lossSum = 0;
  let weightedLossSum = 0;
  let weightSum = 0;
  let userMoves = 0;

  for (const r of rows) {
    if (moverFromPly(r.ply) !== userColor) continue;
    if (r.eval_before == null || r.eval_after == null) continue;
    const moverIsWhite = userColor === "white";
    const before = toMoverCp(decodeEval(r.eval_before), moverIsWhite);
    const after = toMoverCp(decodeEval(r.eval_after), moverIsWhite);
    const loss = Math.min(MAX_MOVE_LOSS, Math.max(0, before - after));

    let weight = 1.0;
    if (before >= -50) weight = 1.3;
    else if (before < -300) weight = 0.5;

    lossSum += loss;
    weightedLossSum += loss * weight;
    weightSum += weight;
    userMoves += 1;
  }

  if (userMoves === 0) return { userMoves: 0, acpl: 0, weightedAcpl: 0 };
  return {
    userMoves,
    acpl: lossSum / userMoves,
    weightedAcpl: weightSum > 0 ? weightedLossSum / weightSum : lossSum / userMoves,
  };
}

/**
 * Trasforma i segnali di una partita nei due esiti (games + play_quality).
 * Modello: la partita è un'OSSERVAZIONE diretta della forza espressa, quindi
 * la trattiamo come una "patta" (score 0.5) contro un avversario pari alla
 * perf-rating della partita — Glicko sposta il dominio verso quel livello.
 * Restituisce `null` se la partita ha troppe poche mosse dell'utente.
 */
export function gameOutcomes(
  signals: GameSignals,
): { games: MatchOutcome; playQuality: MatchOutcome } | null {
  if (signals.userMoves < MIN_GAME_MOVES) return null;
  return {
    games: {
      opponentRating: perfRatingFromAcpl(signals.acpl),
      opponentRd: GAME_OPP_RD,
      score: 0.5,
    },
    playQuality: {
      opponentRating: perfRatingFromAcpl(signals.weightedAcpl),
      opponentRd: GAME_OPP_RD,
      score: 0.5,
    },
  };
}

// ============================================================
// Segnale finali (Fase 3)
// ============================================================

/** RD attribuita a una prova di finale (esito teorico secco: forte segnale). */
export const ENDGAME_OPP_RD = 70;

/** Difficoltà OTB della prova di finale, per `progressKey`. Approssimata e tarabile. */
const ENDGAME_DIFFICULTY: ReadonlyArray<readonly [RegExp, number]> = [
  [/mate|matt|kq_vs_k|kr_vs_k|kqk|krk/i, 700],
  [/opposition|opposizione|kp_vs_k|kpk|re_e_pedone/i, 1100],
  [/lucena|philidor|rook|torre/i, 1500],
  [/q_vs_p|donna_contro_pedone|queen/i, 1700],
];

/** Mappa una chiave di finale alla forza OTB equivalente (default 1300). */
export function endgameDifficulty(progressKey: string): number {
  for (const [re, rating] of ENDGAME_DIFFICULTY) {
    if (re.test(progressKey)) return rating;
  }
  return 1300;
}

/** RD attribuita a una prova di calcolo (esito secco: forte segnale). */
export const CALC_OPP_RD = 80;

/** Punti OTB di bonus per ogni mossa di profondità oltre la seconda. */
export const CALC_DEPTH_BONUS = 45;

// ============================================================
// Aggregazione complessiva
// ============================================================

export interface DomainBreakdown {
  domain: RatingDomain;
  label: string;
  rating: number | null;
  rd: number;
  provisional: boolean;
  samples: number;
}

export interface OverallRating {
  rating: number | null;
  rd: number;
  provisional: boolean;
  ceiling: number;
  breakdown: DomainBreakdown[];
}

/** φ (scala interna) da una RD di visualizzazione. */
function phiOf(rd: number): number {
  return rd / SCALE;
}

/**
 * Combina i domìni in un unico numero.
 * Peso del dominio = priore / φ²  (inverse-variance × importanza).
 * RD complessiva = √(1 / Σ(priore/φ²)) riportata in scala di visualizzazione.
 * Il rating è poi limitato superiormente dal tetto.
 */
export function aggregateOverall(domains: DomainRating[], ceiling: number): OverallRating {
  const active = domains.filter((d) => d.samples > 0);

  const breakdown: DomainBreakdown[] = domains.map((d) => ({
    domain: d.domain,
    label: DOMAIN_LABEL[d.domain],
    rating: d.samples > 0 ? Math.round(d.state.rating) : null,
    rd: Math.round(d.state.rd),
    provisional: d.state.rd > PROVISIONAL_RD_THRESHOLD || d.samples < 5,
    samples: d.samples,
  }));

  if (active.length === 0) {
    return { rating: null, rd: Math.round(RD_FLOOR), provisional: true, ceiling, breakdown };
  }

  let weightSum = 0;
  let weightedRating = 0;
  let precisionSum = 0; // Σ priore/φ²  → precisione combinata
  let totalSamples = 0;
  for (const d of active) {
    const phi = phiOf(d.state.rd);
    const prior = DOMAIN_PRIOR[d.domain];
    const weight = prior / (phi * phi);
    weightSum += weight;
    weightedRating += weight * d.state.rating;
    precisionSum += prior / (phi * phi);
    totalSamples += d.samples;
  }

  const meanRating = weightedRating / weightSum;
  const overallRd = Math.max(RD_FLOOR, SCALE * Math.sqrt(1 / precisionSum));
  const clamped = Math.min(meanRating, ceiling);
  const provisional = overallRd > PROVISIONAL_RD_THRESHOLD || totalSamples < MIN_TOTAL_SAMPLES;

  return {
    rating: Math.round(clamped),
    rd: Math.round(overallRd),
    provisional,
    ceiling,
    breakdown,
  };
}

/** Anchor esportato per i consumatori che servono uno stato a freddo. */
export { GLICKO_ANCHOR };
