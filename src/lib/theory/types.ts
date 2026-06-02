/**
 * Tipi condivisi del modulo Teoria (prompt 06a).
 *
 * Una lezione teorica NON è prosa: è una sequenza guidata sopra una posizione/
 * linea. Il `body` (jsonb) di `content_items` per una lezione ha la forma
 * `Lesson`: un albero di varianti + dei passi che puntano a nodi dell'albero.
 */

import type { Shape, SerializedMoveTree } from "@/lib/chess/moveTree";

export type { Shape, SerializedMoveTree };

/** Tipo di contenuto teorico (mirror dell'enum `content_type` del DB). */
export type TheoryType = "opening" | "middlegame" | "endgame";

export interface LessonStep {
  /** Nodo del tree su cui ci si ferma. */
  nodeId: string;
  /** Spiegazione del "perché" (in italiano). */
  text: string;
  /** Frecce/cerchi da mostrare a questo passo. */
  shapes?: Shape[];
  /** Mosse candidate (SAN) da evidenziare a questo passo. */
  highlightMoves?: string[];
}

export interface Lesson {
  /** Breve introduzione testuale (opzionale). */
  intro?: string;
  /** L'albero della linea principale + varianti. */
  tree: SerializedMoveTree;
  /** Passi guidati che puntano a nodi del tree. */
  steps: LessonStep[];
}

/** Riga `content_items` come letta dal DB (campi usati dalla Teoria). */
export interface ContentItemRow {
  id: string;
  type: TheoryType;
  parent_id: string | null;
  eco_code: string | null;
  title: string;
  slug: string;
  summary: string | null;
  body: Lesson | null;
  start_fen: string | null;
  line_pgn: string | null;
  level: number;
  order_index: number;
  published: boolean;
}

/** Type guard minimale: il body ha la forma attesa di una `Lesson`. */
export function isLesson(body: unknown): body is Lesson {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.tree === "object" &&
    b.tree !== null &&
    Array.isArray(b.steps)
  );
}
