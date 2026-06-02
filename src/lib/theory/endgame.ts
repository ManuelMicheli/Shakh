/**
 * Pratica dei finali (prompt 06c §1). Il `body` (jsonb) di un `content_items` di
 * tipo `endgame` è una `Lesson` (06a) ARRICCHITA con un blocco `practice`: una
 * posizione teorica da CONVERTIRE giocando contro la difesa perfetta della
 * tablebase (verità assoluta, nessuna approssimazione).
 *
 * Il tipo estende `Lesson` senza toccare i tipi condivisi del 06a: il viewer di
 * lezione ignora il campo extra, la pagina del finale lo legge per la pratica.
 */

import type { Lesson } from "@/lib/theory/types";

/** Esito che l'utente deve realizzare partendo dalla posizione di pratica. */
export type EndgameGoal = "win" | "draw";

export interface EndgamePractice {
  /** Posizione di partenza (≤7 pezzi: dentro la tablebase). Tratto = lato utente. */
  fen: string;
  /** Lato che gioca l'utente; l'altro è la tablebase (difesa perfetta). */
  userColor: "white" | "black";
  /** Esito teorico da convertire: vincere una vinta, pattare una pattabile. */
  goal: EndgameGoal;
  /** Chiave per `user_progress` (dimensione `endgame`): es. `lucena`, `kp_vs_k`. */
  progressKey: string;
  /** Suggerimento testuale, opzionale (in italiano). */
  hint?: string;
}

/** `Lesson` di un finale con l'eventuale posizione di pratica. */
export type EndgameLesson = Lesson & { practice?: EndgamePractice };

/** Type guard: il blocco `practice` ha la forma attesa. */
export function hasPractice(body: unknown): body is EndgameLesson & { practice: EndgamePractice } {
  if (!body || typeof body !== "object") return false;
  const p = (body as { practice?: unknown }).practice;
  if (!p || typeof p !== "object") return false;
  const pr = p as Record<string, unknown>;
  return (
    typeof pr.fen === "string" &&
    (pr.userColor === "white" || pr.userColor === "black") &&
    (pr.goal === "win" || pr.goal === "draw") &&
    typeof pr.progressKey === "string"
  );
}
