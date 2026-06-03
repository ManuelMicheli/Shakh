/**
 * Glicko-2 (Glickman, 2013) implementato a mano, senza dipendenze.
 *
 * Sostituisce l'Elo ad-hoc di `src/lib/tactics/rating.ts` per il dominio
 * tattica e diventa il motore di TUTTI i sotto-rating del "Rating Shakh"
 * (vedi `aggregate.ts`). Modulo PURO: nessun accesso al DB, nessuna AI.
 *
 * Tutto è espresso sulla scala Elo "di visualizzazione" (rating, rd, vol).
 * Le conversioni verso/da la scala interna di Glicko-2 (μ, φ) restano private
 * a `updateRatingPeriod`. La calibrazione verso l'Elo OTB reale è altrove
 * (`calibration.ts`): qui il rating dell'avversario arriva già nella scala
 * giusta.
 */

/** Costante di sistema τ: vincola l'oscillazione della volatilità. Basso = severo/stabile. */
export const TAU = 0.5;
/** Fattore di scala fra Elo di visualizzazione e scala interna di Glicko-2. */
export const SCALE = 173.7178;
/** Ancora della scala Glicko (corrisponde a μ = 0). */
export const GLICKO_ANCHOR = 1500;
/** Deviazione iniziale (massima incertezza, utente nuovo). */
export const RD_START = 350;
/** Pavimento della deviazione: volutamente basso → l'incertezza può davvero crollare. */
export const RD_FLOOR = 30;
/** Volatilità iniziale. */
export const VOL_START = 0.06;
/** Deviazione attribuita ai puzzle/avversari di rating noto (Lichess pubblica RD ~50–80). */
export const PUZZLE_OPP_RD = 60;
/** Soglia di convergenza dell'iterazione sulla volatilità. */
const EPSILON = 1e-6;

/** Stato di rating su scala Elo di visualizzazione. */
export interface Glicko2State {
  rating: number;
  rd: number;
  vol: number;
}

/** Un esito contro un avversario di forza nota. `score`: 1 vittoria, 0.5 patta, 0 sconfitta. */
export interface MatchOutcome {
  opponentRating: number;
  opponentRd: number;
  score: number;
}

/** Stato iniziale di un dominio mai allenato. */
export function initialState(rating = GLICKO_ANCHOR): Glicko2State {
  return { rating, rd: RD_START, vol: VOL_START };
}

/** g(φ): smorzamento dell'incertezza dell'avversario. */
function g(phi: number): number {
  return 1 / Math.sqrt(1 + (3 * phi * phi) / (Math.PI * Math.PI));
}

/** E(μ, μ_j, φ_j): punteggio atteso contro un avversario. */
function expected(mu: number, muOpp: number, phiOpp: number): number {
  return 1 / (1 + Math.exp(-g(phiOpp) * (mu - muOpp)));
}

/** Probabilità di vittoria attesa (0..1) contro un avversario, su scala di visualizzazione. */
export function expectedScore(
  state: Glicko2State,
  opponentRating: number,
  opponentRd: number,
): number {
  const mu = (state.rating - GLICKO_ANCHOR) / SCALE;
  const muOpp = (opponentRating - GLICKO_ANCHOR) / SCALE;
  const phiOpp = opponentRd / SCALE;
  return expected(mu, muOpp, phiOpp);
}

/**
 * Aggiorna lo stato su un "periodo" composto da uno o più esiti.
 *  - Nessun esito → solo decadimento dell'incertezza (φ* = √(φ² + σ²)).
 *  - Uno o più esiti → algoritmo completo di Glicko-2 con iterazione (regula
 *    falsi / Illinois) sulla nuova volatilità.
 */
export function updateRatingPeriod(
  state: Glicko2State,
  outcomes: MatchOutcome[],
): Glicko2State {
  const mu = (state.rating - GLICKO_ANCHOR) / SCALE;
  const phi = state.rd / SCALE;
  const sigma = state.vol;

  // Periodo vuoto: l'incertezza cresce, rating e volatilità invariati.
  if (outcomes.length === 0) {
    const phiStar = Math.sqrt(phi * phi + sigma * sigma);
    return fromInternal(mu, phiStar, sigma);
  }

  // Quantità v (varianza stimata) e Δ (variazione attesa del rating).
  let vInv = 0;
  let deltaSum = 0;
  for (const o of outcomes) {
    const muOpp = (o.opponentRating - GLICKO_ANCHOR) / SCALE;
    const phiOpp = o.opponentRd / SCALE;
    const gj = g(phiOpp);
    const e = expected(mu, muOpp, phiOpp);
    vInv += gj * gj * e * (1 - e);
    deltaSum += gj * (o.score - e);
  }
  const v = 1 / vInv;
  const delta = v * deltaSum;

  // Nuova volatilità σ′ via iterazione (Glickman §5.1, metodo di Illinois).
  const sigmaPrime = solveVolatility(phi, sigma, v, delta);

  // Nuova deviazione e nuovo rating.
  const phiStar = Math.sqrt(phi * phi + sigmaPrime * sigmaPrime);
  const phiPrime = 1 / Math.sqrt(1 / (phiStar * phiStar) + 1 / v);
  const muPrime = mu + phiPrime * phiPrime * deltaSum;

  return fromInternal(muPrime, phiPrime, sigmaPrime);
}

/** Risolve f(x)=0 per x=ln(σ′²) con il metodo di Illinois. */
function solveVolatility(phi: number, sigma: number, v: number, delta: number): number {
  const a = Math.log(sigma * sigma);
  const phi2 = phi * phi;
  const delta2 = delta * delta;

  const f = (x: number): number => {
    const ex = Math.exp(x);
    const num = ex * (delta2 - phi2 - v - ex);
    const den = 2 * Math.pow(phi2 + v + ex, 2);
    return num / den - (x - a) / (TAU * TAU);
  };

  let A = a;
  let B: number;
  if (delta2 > phi2 + v) {
    B = Math.log(delta2 - phi2 - v);
  } else {
    let k = 1;
    while (f(a - k * TAU) < 0) k += 1;
    B = a - k * TAU;
  }

  let fA = f(A);
  let fB = f(B);
  let guard = 0;
  while (Math.abs(B - A) > EPSILON && guard < 1000) {
    const C = A + ((A - B) * fA) / (fB - fA);
    const fC = f(C);
    if (fC * fB <= 0) {
      A = B;
      fA = fB;
    } else {
      fA /= 2;
    }
    B = C;
    fB = fC;
    guard += 1;
  }
  return Math.exp(A / 2);
}

/** Dalla scala interna (μ, φ, σ) allo stato di visualizzazione, con pavimento sulla RD. */
function fromInternal(mu: number, phi: number, vol: number): Glicko2State {
  const rating = GLICKO_ANCHOR + SCALE * mu;
  const rd = Math.max(RD_FLOOR, SCALE * phi);
  return { rating, rd, vol };
}
