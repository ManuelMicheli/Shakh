/**
 * Tipi condivisi del dominio "tattiche" (puzzle + SRS + rating).
 * Rispecchiano le tabelle `puzzles`, `user_puzzle_attempts` (campi SRS) e
 * `user_tactic_stats` del prompt 05.
 */

/** Le quattro modalità di allenamento della pagina `/app/tattiche`. */
export type TacticMode = "adaptive" | "theme" | "review" | "timed";

/** Un puzzle pronto per il solver (mosse già spezzate in UCI). */
export interface Puzzle {
  id: string;
  /** Posizione PRIMA della prima mossa di `moves` (convenzione Lichess). */
  fen: string;
  /**
   * Soluzione in UCI. La PRIMA mossa è giocata automaticamente dall'avversario
   * (innesco); il solver parte dalla SECONDA.
   */
  moves: string[];
  rating: number;
  themes: string[];
  popularity: number | null;
}

/** Stato del solver dell'utente (tabella `user_tactic_stats`). */
export interface TacticStats {
  rating: number;
  ratingDeviation: number;
  puzzlesSolved: number;
  puzzlesFailed: number;
  currentStreak: number;
  bestStreak: number;
}

/** Esito di un puzzle risolto, prodotto dal `<PuzzleSolver>`. */
export interface SolveResult {
  /** Risolto senza alcuna mossa errata (prima soluzione corretta). */
  clean: boolean;
  /** Ha usato il suggerimento (niente aggiornamento del rating). */
  hinted: boolean;
  /** Tempo impiegato dall'inizio del solver alla soluzione. */
  timeMs: number;
}

/** Payload con cui il trainer registra un tentativo via Server Action. */
export interface AttemptInput extends SolveResult {
  puzzleId: string;
  puzzleRating: number;
  themes: string[];
  /** True se il puzzle proveniva dalla coda di ripasso (SRS già attivo). */
  fromReview: boolean;
}
