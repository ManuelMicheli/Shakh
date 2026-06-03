/**
 * Sceglie il "momento migliore" di una partita per il reel: la mossa più bella
 * dell'utente (brilliant → best → good), a parità la più forte per valutazione.
 *
 * Deterministico. Riusa i decoder di `evalScore.ts`, `evalText`/`moverFromPly`
 * di `ai/format.ts` e `chess.js` per ricavare origine/destinazione dal SAN.
 */
import { Chess } from "chess.js";
import { decodeEval, toMoverCp } from "@/lib/analysis/evalScore";
import { evalText, moverFromPly } from "@/lib/ai/format";
import type { ReelData } from "./payload";

export interface HighlightRow {
  ply: number;
  san: string;
  fen: string;
  eval_after: number | null;
  classification: string | null;
}

const SCORE: Record<string, number> = { brilliant: 3, best: 2, good: 1 };
const START_FEN = new Chess().fen();

/** Ritorna i dati del reel (senza `title`) o null se non c'è un momento adatto. */
export function pickHighlight(
  rows: HighlightRow[],
  userColor: "white" | "black",
): Omit<ReelData, "title"> | null {
  const byPly = new Map<number, HighlightRow>();
  for (const r of rows) byPly.set(r.ply, r);

  const isWhite = userColor === "white";
  const candidates = rows
    .filter((r) => moverFromPly(r.ply) === userColor)
    .filter((r) => r.classification && SCORE[r.classification] != null)
    .map((r) => ({
      row: r,
      rank: SCORE[r.classification as string],
      cp: r.eval_after != null ? toMoverCp(decodeEval(r.eval_after), isWhite) : -Infinity,
    }))
    .sort((a, b) => b.rank - a.rank || b.cp - a.cp);

  for (const c of candidates) {
    const P = c.row.ply;
    const fenBefore = byPly.get(P - 1)?.fen ?? START_FEN;
    let from: string;
    let to: string;
    try {
      const m = new Chess(fenBefore).move(c.row.san);
      from = m.from;
      to = m.to;
    } catch {
      continue; // SAN non applicabile a questa FEN: prova il candidato successivo
    }

    const fens = dedupe([byPly.get(P - 2)?.fen, fenBefore, byPly.get(P)?.fen]);
    if (fens.length < 2) continue;

    return {
      fens,
      from,
      to,
      label: c.row.classification as string,
      san: c.row.san,
      evalText: evalText(c.row.eval_after) ?? "",
      orientation: userColor,
    };
  }
  return null;
}

/** Rimuove valori nulli e duplicati consecutivi. */
function dedupe(items: (string | undefined)[]): string[] {
  const out: string[] = [];
  for (const x of items) {
    if (!x) continue;
    if (out.length && out[out.length - 1] === x) continue;
    out.push(x);
  }
  return out;
}
