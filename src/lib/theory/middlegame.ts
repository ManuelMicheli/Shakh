/**
 * Esercizi posizionali del mediogioco (prompt 06c §2). Il mediogioco strategico
 * non si presta ai puzzle tattici secchi del 05: NON c'è un'unica soluzione.
 *
 * Il `body` (jsonb) di un `content_items` di tipo `middlegame` è una `Lesson`
 * (06a) arricchita con un blocco `exercise` "trova il piano": l'utente propone
 * una mossa, il MOTORE (02) la valuta, il COACH (04, Funzione B) commenta se è
 * coerente col piano corretto — si valuta la ragionevolezza, non l'esattezza.
 *
 * Estende `Lesson` senza toccare i tipi condivisi del 06a.
 */

import type { Lesson } from "@/lib/theory/types";

export interface PositionalExercise {
  /** Posizione-tipo dell'esercizio. Tratto = lato che deve trovare il piano. */
  fen: string;
  /** Lato di cui l'utente cerca il piano. */
  userColor: "white" | "black";
  /** La consegna in italiano: cosa cercare (es. "Trova un piano per il Bianco"). */
  prompt: string;
  /** Idea del piano corretto (bozza da revisione), mostrata dopo il tentativo. */
  planHint?: string;
  /** Tema Lichess corrispondente per linkare al trainer a tema del 05 (opzionale). */
  relatedTacticsTheme?: string;
  /** Chiave per `user_progress` (dimensione `middlegame_theme`): slug del tema. */
  progressKey: string;
}

/** `Lesson` di un tema di mediogioco con l'eventuale esercizio posizionale. */
export type MiddlegameLesson = Lesson & { exercise?: PositionalExercise };

/** Type guard: il blocco `exercise` ha la forma attesa. */
export function hasExercise(
  body: unknown,
): body is MiddlegameLesson & { exercise: PositionalExercise } {
  if (!body || typeof body !== "object") return false;
  const e = (body as { exercise?: unknown }).exercise;
  if (!e || typeof e !== "object") return false;
  const ex = e as Record<string, unknown>;
  return (
    typeof ex.fen === "string" &&
    (ex.userColor === "white" || ex.userColor === "black") &&
    typeof ex.prompt === "string" &&
    typeof ex.progressKey === "string"
  );
}
