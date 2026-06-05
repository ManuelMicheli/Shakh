/**
 * La Lega — rango passivo derivato dal Rating Shakh complessivo.
 *
 * Sei divisioni a tema "pezzi". La divisione NON si gioca: è una funzione pura
 * del rating live (`user_ratings` dominio `overall`). Sale/scende da sé al
 * muoversi del rating. È anche il gating dei Campionati: il tuo Campionato è
 * quello della tua divisione.
 *
 * Modulo puro (niente I/O): mappatura rating → divisione e utilità di
 * promozione/retrocessione usate a fine stagione dei Campionati.
 */

export type DivisionKey =
  | "pedone"
  | "cavallo"
  | "alfiere"
  | "torre"
  | "donna"
  | "re";

export interface Division {
  key: DivisionKey;
  /** Ordine crescente di forza (0 = più bassa). */
  tier: number;
  /** Nome mostrato. */
  name: string;
  /** Glifo del pezzo (Unicode bianco). */
  glyph: string;
  /** Soglia minima di rating inclusiva. */
  min: number;
  /** Soglia massima inclusiva (Infinity per la più alta). */
  max: number;
  /** Titolo onorifico conquistato raggiungendo la divisione (riconoscimento). */
  title: string;
  /** Riconoscimento/premio sbloccato in questa divisione (una riga, cosmetico). */
  reward: string;
}

/** Divisioni dalla più bassa alla più alta. Bande contigue, niente buchi. */
export const DIVISIONS: Division[] = [
  {
    key: "pedone",
    tier: 0,
    name: "Pedone",
    glyph: "♙",
    min: 0,
    max: 999,
    title: "Esordiente",
    reward: "L'inizio del percorso: ogni partita conta.",
  },
  {
    key: "cavallo",
    tier: 1,
    name: "Cavallo",
    glyph: "♘",
    min: 1000,
    max: 1299,
    title: "Combattente",
    reward: "Primo distintivo e accesso al Campionato di divisione.",
  },
  {
    key: "alfiere",
    tier: 2,
    name: "Alfiere",
    glyph: "♗",
    min: 1300,
    max: 1599,
    title: "Stratega",
    reward: "Sigillo dell'Alfiere sul profilo.",
  },
  {
    key: "torre",
    tier: 3,
    name: "Torre",
    glyph: "♖",
    min: 1600,
    max: 1899,
    title: "Veterano",
    reward: "Riconoscimento da giocatore di club affermato.",
  },
  {
    key: "donna",
    tier: 4,
    name: "Donna",
    glyph: "♕",
    min: 1900,
    max: 2199,
    title: "Maestro di Club",
    reward: "Onorificenza della Donna: élite della Lega.",
  },
  {
    key: "re",
    tier: 5,
    name: "Re",
    glyph: "♔",
    min: 2200,
    max: Infinity,
    title: "Campione",
    reward: "La vetta: corona del Re e posto nell'albo d'oro.",
  },
];

const BY_KEY = new Map(DIVISIONS.map((d) => [d.key, d]));
const BY_TIER = new Map(DIVISIONS.map((d) => [d.tier, d]));

export const MIN_TIER = 0;
export const MAX_TIER = DIVISIONS.length - 1;

/** Divisione corrispondente a un rating. Clamp ai due estremi. */
export function divisionForRating(rating: number): Division {
  for (const d of DIVISIONS) {
    if (rating >= d.min && rating <= d.max) return d;
  }
  return rating < DIVISIONS[0].min ? DIVISIONS[0] : DIVISIONS[MAX_TIER];
}

export function divisionByKey(key: string): Division | undefined {
  return BY_KEY.get(key as DivisionKey);
}

export function divisionByTier(tier: number): Division {
  const clamped = Math.max(MIN_TIER, Math.min(MAX_TIER, tier));
  return BY_TIER.get(clamped)!;
}

/**
 * Divisione di iscrizione alla PROSSIMA stagione: parte dalla divisione del
 * rating attuale, poi applica lo spareggio di classifica del Campionato appena
 * chiuso — 1° del girone +1 divisione, ultimo −1 — con clamp agli estremi.
 *
 * `rankShift`: +1 (promosso), −1 (retrocesso), 0 (resta col rating).
 */
export function nextSeasonDivision(
  currentRating: number,
  rankShift: -1 | 0 | 1,
): Division {
  const base = divisionForRating(currentRating);
  return divisionByTier(base.tier + rankShift);
}

/** Progresso 0..1 dentro la banda della divisione (per barre/UI). */
export function progressInDivision(rating: number, d: Division): number {
  if (!isFinite(d.max)) return 1;
  const span = d.max - d.min;
  if (span <= 0) return 0;
  return Math.max(0, Math.min(1, (rating - d.min) / span));
}

/** Punti che mancano alla divisione superiore (null se già al vertice). */
export function pointsToPromotion(rating: number, d: Division): number | null {
  if (d.tier >= MAX_TIER) return null;
  return Math.max(0, d.max + 1 - rating);
}
