/**
 * Cloud eval gratuita di Lichess (OPZIONALE, predisposta ma disattivata di default).
 *
 * Prima di calcolare localmente si può chiedere a Lichess se la posizione è già
 * nota: `GET https://lichess.org/api/cloud-eval?fen=...`. Se la conosce risparmia
 * CPU; se risponde 404 si calcola col motore locale.
 *
 * La cloud eval restituisce `cp`/`mate` dal punto di vista di CHI MUOVE, come UCI:
 * convertiamo a white-relative con `toWhiteRelative` del prompt 02.
 */

import { toWhiteRelative } from "@/lib/engine/score";
import type { PovEval } from "./evalScore";

export interface CloudEvalResult {
  eval: PovEval;
  bestUci: string;
}

function turnFromFen(fen: string): "w" | "b" {
  return fen.split(" ")[1] === "b" ? "b" : "w";
}

/** Ritorna la valutazione cloud, oppure null se non disponibile/errore. */
export async function fetchCloudEval(
  fen: string,
  multiPv = 1,
): Promise<CloudEvalResult | null> {
  try {
    const url = `https://lichess.org/api/cloud-eval?fen=${encodeURIComponent(
      fen,
    )}&multiPv=${multiPv}`;
    const res = await fetch(url);
    if (!res.ok) return null; // 404 = posizione non in cache
    const data = (await res.json()) as {
      pvs?: { moves: string; cp?: number; mate?: number }[];
    };
    const pv = data.pvs?.[0];
    if (!pv) return null;

    const turn = turnFromFen(fen);
    const bestUci = pv.moves.split(" ")[0] ?? "";
    if (pv.mate != null) {
      return {
        eval: { type: "mate", value: toWhiteRelative(pv.mate, "mate", turn) },
        bestUci,
      };
    }
    if (pv.cp != null) {
      return {
        eval: { type: "cp", value: toWhiteRelative(pv.cp, "cp", turn) },
        bestUci,
      };
    }
    return null;
  } catch {
    return null;
  }
}
