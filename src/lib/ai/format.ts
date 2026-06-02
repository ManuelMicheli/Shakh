/**
 * Conversione dei dati oggettivi del motore in testo leggibile per il prompt.
 * Tutto deterministico: nessuna di queste funzioni "valuta" la posizione, si
 * limita a tradurre numeri già calcolati in italiano comprensibile al modello.
 */

import { decodeEval } from "@/lib/analysis/evalScore";
import { formatEval } from "@/lib/engine/score";
import { CLASSIFICATION_META } from "@/lib/analysis/labels";
import type { Classification } from "@/lib/games/types";
import type { GamePhase } from "./types";

/** Valutazione codificata su DB → stringa white-relative ("+1.4", "−0.7", "M5"). */
export function evalText(encoded: number | null): string | null {
  if (encoded == null) return null;
  const e = decodeEval(encoded);
  // Usa il segno meno tipografico per il testo destinato all'utente.
  return formatEval(e.value, e.type).replace("-", "−");
}

/** Etichetta italiana della classificazione (riusa la tabella della UI). */
export function classificationLabel(c: Classification | null): string {
  return c ? CLASSIFICATION_META[c].label : "—";
}

const PHASE_LABEL: Record<GamePhase, string> = {
  opening: "apertura",
  middlegame: "mediogioco",
  endgame: "finale",
};

export function phaseLabel(phase: GamePhase): string {
  return PHASE_LABEL[phase];
}

/**
 * Fase di gioco derivata dalla FEN (materiale) e dal numero di mossa.
 * Euristica deterministica — NON è un giudizio del modello:
 *  - apertura: entro la 10ª mossa completa;
 *  - finale: poco materiale pesante residuo;
 *  - altrimenti mediogioco.
 */
export function phaseFromFen(fen: string): GamePhase {
  const placement = fen.split(" ")[0] ?? "";
  const fullmoveStr = fen.split(" ")[5];
  const fullmove = Number(fullmoveStr) || 1;

  // Conta i pezzi (escludendo re e pedoni) per stimare il materiale residuo.
  let majorMinor = 0;
  let queens = 0;
  for (const ch of placement) {
    const lower = ch.toLowerCase();
    if (lower === "q") {
      queens++;
      majorMinor++;
    } else if (lower === "r" || lower === "b" || lower === "n") {
      majorMinor++;
    }
  }

  if (fullmove <= 10 && majorMinor >= 12) return "opening";
  if (majorMinor <= 6 || (queens === 0 && majorMinor <= 8)) return "endgame";
  return "middlegame";
}

/** Lato che ha mosso al semimosso `ply` (1-based): ply dispari = Bianco. */
export function moverFromPly(ply: number): "white" | "black" {
  return ply % 2 === 1 ? "white" : "black";
}
