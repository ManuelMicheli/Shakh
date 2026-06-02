import { Chess, type Square, type PieceSymbol } from "chess.js";

/**
 * Converte una linea di motore (mosse UCI, es. "e2e4") in SAN leggibile,
 * a partire da una FEN. Si ferma alla prima mossa illegale (linea troncata).
 */
export function uciPvToSan(fen: string, uci: string[], max = 6): string[] {
  const chess = new Chess(fen);
  const san: string[] = [];
  for (const mv of uci.slice(0, max)) {
    const move = parseUci(mv);
    if (!move) break;
    try {
      const res = chess.move(move);
      san.push(res.san);
    } catch {
      break;
    }
  }
  return san;
}

/** Prima mossa UCI → SAN nella posizione data (null se illegale). */
export function uciMoveToSan(fen: string, uci: string): string | null {
  const move = parseUci(uci);
  if (!move) return null;
  try {
    return new Chess(fen).move(move).san;
  } catch {
    return null;
  }
}

/**
 * Se `san` è una mossa legale nella posizione, ritorna la FEN risultante e il
 * SAN canonico (chess.js); altrimenti null. Usato per valutare col motore una
 * mossa concreta citata in una domanda ("perché non Cd4?").
 */
export function tryPlaySan(
  fen: string,
  san: string,
): { fen: string; san: string } | null {
  try {
    const chess = new Chess(fen);
    const res = chess.move(san);
    return { fen: chess.fen(), san: res.san };
  } catch {
    return null;
  }
}

function parseUci(
  uci: string,
): { from: Square; to: Square; promotion?: PieceSymbol } | null {
  if (uci.length < 4) return null;
  const from = uci.slice(0, 2) as Square;
  const to = uci.slice(2, 4) as Square;
  const promotion = uci.length > 4 ? (uci[4] as PieceSymbol) : undefined;
  return { from, to, promotion };
}
