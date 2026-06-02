/**
 * Tipi condivisi del "percorso guidato" (prompt 07).
 * Rispecchiano `path_nodes` / `user_path_progress` / `content_completions`.
 */

export type PathNodeStatus = "locked" | "available" | "in_progress" | "completed";

/** Un'attività collegata a un nodo: bottone verso il modulo giusto. */
export interface PathActivity {
  label: string;
  href: string;
}

/**
 * Tipi di requisito verificabili (in `path_nodes.requirements`, array jsonb).
 * Ognuno LEGGE i dati di un modulo esistente — nessuna duplicazione di progressi.
 * `weight` opzionale (default 1) pesa il contributo nella media del nodo.
 */
export type Requirement =
  | { type: "lesson"; slug: string; weight?: number }
  | { type: "puzzles_theme"; theme: string; count: number; minSuccessRate: number; weight?: number }
  | { type: "endgame_practice"; key: string; weight?: number }
  | { type: "middlegame_theme"; key: string; minSuccessRate: number; weight?: number }
  | { type: "opening_drill"; key?: string; minAccuracy: number; weight?: number }
  | { type: "analyze_games"; count: number; weight?: number }
  | { type: "tactic_rating"; min: number; weight?: number };

/** Riga curricolare (tabella `path_nodes`). */
export interface PathNodeRow {
  id: string;
  level: number;
  slug: string;
  title: string;
  description: string | null;
  order_index: number;
  prerequisites: string[];
  requirements: Requirement[];
  activities: PathActivity[];
  published: boolean;
}

/** Nodo arricchito con lo stato dell'utente (per la UI dello skill tree). */
export interface PathNodeView extends PathNodeRow {
  status: PathNodeStatus;
  progress: number; // 0..1
}

/** Esito della valutazione di un singolo requisito. */
export interface RequirementResult {
  /** Avanzamento 0..1 verso il soddisfacimento. */
  progress: number;
  /** Soddisfatto del tutto? */
  met: boolean;
}
