/**
 * Supporto alla notazione SAN italiana nelle domande del coach.
 * In italiano i pezzi sono R(e), D(onna), T(orre), A(lfiere), C(avallo);
 * chess.js parla SAN inglese (K, Q, R, B, N). Qui traduciamo e isoliamo i
 * possibili riferimenti a mosse dentro una frase ("perché non Cd4?").
 */

const PIECE_IT_TO_EN: Record<string, string> = {
  R: "K", // Re → King
  D: "Q", // Donna → Queen
  T: "R", // Torre → Rook
  A: "B", // Alfiere → Bishop
  C: "N", // Cavallo → Knight
};

/** Traduce la lettera di pezzo iniziale (se italiana) in SAN inglese. */
export function italianToEnglishSan(token: string): string {
  if (token.length === 0) return token;
  const first = token[0];
  const en = PIECE_IT_TO_EN[first];
  return en ? en + token.slice(1) : token;
}

/**
 * Estrae dalla frase i token che assomigliano a una mossa (SAN it/en o arrocco).
 * È solo un filtro grossolano: la legalità la verifica poi chess.js.
 */
export function extractMoveTokens(text: string): string[] {
  const tokens = new Set<string>();
  // Arrocco.
  for (const m of text.matchAll(/\bO-O(?:-O)?\b/gi)) tokens.add(m[0].toUpperCase());
  // Mosse di pezzo o di pedone, lettere di pezzo it+en.
  const re = /\b([KQRBNDTACkqrbndtac]?)([a-h]?[1-8]?x?[a-h][1-8](?:=[QRBNDTA])?)[+#]?/g;
  for (const m of text.matchAll(re)) {
    const piece = m[1];
    const rest = m[2];
    if (!rest) continue;
    // Solo se la lettera iniziale è una lettera di pezzo MAIUSCOLA o assente.
    const upper = piece ? piece.toUpperCase() : "";
    tokens.add(upper + rest);
  }
  return [...tokens];
}
