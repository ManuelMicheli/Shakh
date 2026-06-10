/**
 * Tipi condivisi del dominio "coach AI" (prompt 04).
 * Niente import del SDK qui, così i tipi viaggiano anche lato client.
 */

import type { Classification } from "@/lib/games/types";

/** Fase di gioco derivata in modo deterministico (mai chiesta al modello). */
export type GamePhase = "opening" | "middlegame" | "endgame";

/**
 * Dati OGGETTIVI di una mossa, già calcolati dal motore (prompt 02/03).
 * È l'input fattuale della Funzione A: il modello li spiega, non li ricalcola.
 */
export interface MoveFacts {
  /** FEN della posizione PRIMA della mossa giocata. */
  fenBefore: string;
  /** Mossa giocata in SAN. */
  playedSan: string;
  /** Classificazione deterministica del motore. */
  classification: Classification | null;
  /** Mossa migliore secondo il motore, in SAN. */
  bestMoveSan: string | null;
  /** Valutazione (white-relative, già formattata) prima della mossa, es. "+0.3". */
  evalBeforeText: string | null;
  /** Valutazione dopo la mossa giocata, es. "−1.8". */
  evalAfterText: string | null;
  /** Fase di gioco. */
  phase: GamePhase;
  /** Lato che ha mosso. */
  mover: "white" | "black";
  /**
   * Effetti DETERMINISTICI della mossa giocata sulla scacchiera (traiettorie
   * aperte/chiuse, minacce nuove, pezzi in presa), calcolati con chess.js.
   */
  playedEffects?: string | null;
  /** Effetti della mossa migliore del motore, se diversa da quella giocata. */
  bestEffects?: string | null;
}

/** Una linea di motore fornita come base fattuale alla Q&A. */
export interface EngineLineFact {
  /** Valutazione white-relative formattata, es. "+0.6" o "M3". */
  evalText: string;
  /** Seguito principale in SAN, es. ["e4", "e5", "Cf3"]. */
  pvSan: string[];
}

/** Base fattuale di una domanda Q&A: tutto calcolato dal motore lato client. */
export interface PositionFacts {
  fen: string;
  /** Lato al tratto nella posizione. */
  turn: "w" | "b";
  /** Linee migliori del motore (multiPV), la prima è la principale. */
  lines: EngineLineFact[];
  /**
   * Valutazione di una mossa concreta citata nella domanda ("perché non Cd4?"),
   * se il motore l'ha analizzata. Assente per domande generali di piano.
   */
  askedMove?: {
    san: string;
    evalText: string;
    /** true se è (anche) la mossa migliore. */
    isBest: boolean;
  };
}

/** Battuta della conversazione Q&A inviata al modello (memoria breve). */
export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

/** Metriche aggregate deterministiche dei pattern d'errore dell'utente. */
export interface PhaseStats {
  phase: GamePhase;
  moves: number;
  inaccuracies: number;
  mistakes: number;
  blunders: number;
  /** Quota di mosse senza errore, 0..1. */
  score: number;
}

export interface UserMetrics {
  games: number;
  userMoves: number;
  byPhase: PhaseStats[];
  /** Fase con lo score più basso (se ci sono dati). */
  worstPhase: GamePhase | null;
  blunders: number;
  mistakes: number;
  inaccuracies: number;
}

/** Output strutturato della sintesi AI (Funzione C). Solo JSON dal modello. */
export interface CoachSynthesis {
  summary: string;
  focusAreas: string[];
  suggestion: string;
}

/**
 * Metriche AGGREGATE di una classe (prompt 09 §7), già calcolate in modo
 * deterministico dall'aggregazione dei membri. Input della sintesi di classe:
 * il modello produce SOLO la frase di sintesi, non ricalcola nulla.
 */
export interface ClassMetrics {
  studentCount: number;
  areas: { label: string; avgScore: number | null; studentsWithData: number }[];
  commonWeaknesses: { label: string; count: number }[];
}
