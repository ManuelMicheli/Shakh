/**
 * Ripetizione spaziata tipo SM-2 semplificato sui puzzle sbagliati.
 * L'SRS serve a ri-vedere ciò che NON si sa: un puzzle fallito torna presto,
 * uno risolto allunga progressivamente l'intervallo.
 */

export interface SrsState {
  ease: number;
  intervalDays: number;
}

export interface SrsSchedule {
  ease: number;
  intervalDays: number;
  /** Quando rivedere il puzzle, in giorni da adesso (può essere frazionario). */
  dueInDays: number;
}

const EASE_DEFAULT = 2.5;
const EASE_MIN = 1.3;
const EASE_MAX = 3.0;
/** Intervallo "torna presto" per un fallimento: ~10 minuti. */
const FAIL_DUE_DAYS = 10 / (60 * 24);

/**
 * Calcola la prossima schedulazione.
 * @param prev   stato SRS precedente (null se il puzzle non era ancora in SRS)
 * @param solved true se risolto pulito a questa ripetizione
 */
export function scheduleNext(prev: SrsState | null, solved: boolean): SrsSchedule {
  const ease = prev?.ease ?? EASE_DEFAULT;
  const intervalDays = prev?.intervalDays ?? 0;

  if (!solved) {
    // Fallito → ease giù, intervallo azzerato, ritorno imminente.
    return {
      ease: clampEase(ease - 0.2),
      intervalDays: 0,
      dueInDays: FAIL_DUE_DAYS,
    };
  }

  // Risolto → l'intervallo cresce.
  let next: number;
  if (intervalDays <= 0) next = 1;
  else if (intervalDays === 1) next = 3;
  else next = Math.round(intervalDays * ease);

  return {
    ease: clampEase(ease + 0.1),
    intervalDays: next,
    dueInDays: next,
  };
}

function clampEase(e: number): number {
  return Math.min(EASE_MAX, Math.max(EASE_MIN, Math.round(e * 100) / 100));
}
