/**
 * Validazione/sanificazione input prima di motore/AI/DB (prompt 10, §6).
 * Controlli sintattici leggeri: chess.js resta l'autorità sulla legalità, ma
 * questi guard fermano payload malformati o abusivi prima di spendere risorse.
 */

/** FEN plausibile: 6 campi, board valida, tratto w/b. Non verifica la legalità. */
export function isPlausibleFen(fen: unknown): fen is string {
  if (typeof fen !== "string") return false;
  const s = fen.trim();
  if (s.length > 100) return false;
  const parts = s.split(/\s+/);
  if (parts.length < 4) return false;
  const [board, turn] = parts;
  if (turn !== "w" && turn !== "b") return false;
  const ranks = board.split("/");
  if (ranks.length !== 8) return false;
  return /^[pnbrqkPNBRQK1-8]+$/.test(board.replace(/\//g, ""));
}

/** Limita una domanda in linguaggio naturale a una lunghezza ragionevole. */
export function clampQuestion(q: unknown, max = 500): string | null {
  if (typeof q !== "string") return null;
  const t = q.trim();
  if (!t) return null;
  return t.slice(0, max);
}
