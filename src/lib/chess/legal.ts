import { Chess } from "chess.js";
import type { LegalDests } from "./useChessGame";

/**
 * Mosse legali (origine → destinazioni) per una FEN qualsiasi, nel formato che
 * chessground si aspetta. Ritorna una mappa vuota se la FEN è invalida.
 * Utile fuori dall'hook `useChessGame` (es. partita online guidata dal server).
 */
export function legalDestsForFen(fen: string): LegalDests {
  const dests: LegalDests = new Map();
  try {
    const chess = new Chess(fen);
    for (const m of chess.moves({ verbose: true })) {
      const list = dests.get(m.from);
      if (list) list.push(m.to);
      else dests.set(m.from, [m.to]);
    }
  } catch {
    /* FEN invalida: nessuna mossa */
  }
  return dests;
}
