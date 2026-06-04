/**
 * Inferenza del "motivo" di un errore di partita, per il ciclo
 * errore → mini-lezione (Fase 5). Da un blunder/mistake ricaviamo una classe
 * grossolana e i temi puzzle Lichess corrispondenti, così da servire 3 esercizi
 * mirati e poi ri-testare.
 *
 * Deterministico, NESSUNA AI: euristiche sul `best_move_san` mancato, sulla
 * valutazione disponibile e sulla fase. Volutamente grossolano — non promette
 * il motivo esatto, ma un allenamento pertinente.
 */

export type MotifClass = "mate" | "tactic" | "conversion";

/**
 * Classifica l'errore.
 *  - `mate`: c'era un matto forzato disponibile (la valutazione migliore era matto a favore).
 *  - `tactic`: la mossa migliore era forzante (cattura/scacco/promozione) con grande oscillazione.
 *  - `conversion`: né matto né colpo forzante — tecnica/conversione di un vantaggio.
 */
export function classifyMotif(params: {
  mateForUser: boolean;
  bestSan: string | null;
  cpLoss: number;
}): MotifClass {
  if (params.mateForUser) return "mate";
  if (isForcing(params.bestSan) && params.cpLoss >= 150) return "tactic";
  return "conversion";
}

/** Temi puzzle Lichess da interrogare (qualsiasi di questi → esercizio pertinente). */
export function motifThemes(motif: MotifClass): string[] {
  switch (motif) {
    case "mate":
      return ["mate", "mateIn1", "mateIn2", "mateIn3", "backRankMate", "sacrifice"];
    case "tactic":
      return ["fork", "pin", "skewer", "hangingPiece", "discoveredAttack", "sacrifice"];
    case "conversion":
      return ["advantage", "endgame", "rookEndgame", "queenEndgame"];
  }
}

/** Etichetta italiana. */
export function motifLabel(motif: MotifClass): string {
  switch (motif) {
    case "mate":
      return "Missed mate";
    case "tactic":
      return "Missed tactic";
    case "conversion":
      return "Unconverted advantage";
  }
}

/** La SAN indica una mossa forzante: cattura (x), scacco (+/#) o promozione (=). */
export function isForcing(san: string | null): boolean {
  if (!san) return false;
  return /[x+#]/.test(san) || san.includes("=");
}
