/**
 * Regola del "tetto" (ceiling) anti-inflazione.
 *
 * Principio: NON puoi avere un rating alto se non hai mai dimostrato di battere
 * con costanza problemi di quella difficoltà. Risolvere mille puzzle elementari
 * non deve spingere il numero verso l'alto. Il tetto limita il rating COMPLESSIVO
 * (vedi `aggregate.ts`) alla difficoltà massima effettivamente superata in modo
 * affidabile, indipendentemente da quanto Glicko vorrebbe alzarlo.
 *
 * Modulo PURO: riceve i conteggi già aggregati per fascia (OTB) e restituisce
 * il tetto. La lettura dal DB avviene in `store.ts`.
 */

/** Ampiezza di una fascia di difficoltà, in punti OTB. */
export const BAND_WIDTH = 200;
/** Tentativi minimi in una fascia perché "conti". */
export const MIN_BAND_ATTEMPTS = 5;
/** Tasso di successo minimo per considerare la fascia "superata". */
export const MIN_BAND_SUCCESS_RATE = 0.6;
/** Spazio di manovra concesso sopra l'ultima fascia superata. */
export const CEILING_HEADROOM = 100;
/** Tetto minimo quando nessuna fascia è ancora qualificata. */
export const CEILING_FLOOR = 1000;

/** Conteggi di una fascia di difficoltà (puzzle raggruppati per rating OTB). */
export interface BandResult {
  /** Estremo inferiore della fascia, in Elo OTB (multiplo di BAND_WIDTH). */
  bandFloor: number;
  attempts: number;
  successes: number;
}

/** Arrotonda un rating OTB all'estremo inferiore della sua fascia. */
export function bandFloorOf(otb: number): number {
  return Math.floor(otb / BAND_WIDTH) * BAND_WIDTH;
}

/**
 * Tetto = (estremo superiore della fascia più alta superata) + headroom.
 * "Superata" = abbastanza tentativi E tasso di successo sufficiente.
 * Se nessuna fascia è qualificata → CEILING_FLOOR.
 */
export function computeCeiling(bands: BandResult[]): number {
  let highestQualified = -Infinity;
  for (const b of bands) {
    if (b.attempts < MIN_BAND_ATTEMPTS) continue;
    if (b.successes / b.attempts < MIN_BAND_SUCCESS_RATE) continue;
    if (b.bandFloor > highestQualified) highestQualified = b.bandFloor;
  }
  if (highestQualified === -Infinity) return CEILING_FLOOR;
  return highestQualified + BAND_WIDTH + CEILING_HEADROOM;
}
