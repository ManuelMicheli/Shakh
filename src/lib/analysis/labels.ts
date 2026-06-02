/**
 * Etichette, glifi e colori semantici per le classificazioni.
 * I colori sono i `--eval-*` del prompt 00: UNICA eccezione al monocromatico,
 * ammessi solo nel contesto dell'analisi delle mosse.
 */

import type { Classification } from "@/lib/games/types";

export interface ClassificationMeta {
  label: string;
  /** Variabile CSS del colore semantico. */
  color: string;
  /** Glifo in stile annotazione scacchistica (NAG). */
  glyph: string;
  /** Se mostrare un marcatore accanto alla mossa (good/book/brilliant: no). */
  marked: boolean;
}

export const CLASSIFICATION_META: Record<Classification, ClassificationMeta> = {
  brilliant: { label: "Brillante", color: "var(--eval-brilliant)", glyph: "!!", marked: false },
  best: { label: "Migliore", color: "var(--eval-best)", glyph: "✓", marked: true },
  good: { label: "Buona", color: "var(--eval-good)", glyph: "", marked: false },
  inaccuracy: { label: "Imprecisione", color: "var(--eval-inaccuracy)", glyph: "?!", marked: true },
  mistake: { label: "Errore", color: "var(--eval-mistake)", glyph: "?", marked: true },
  blunder: { label: "Grave errore", color: "var(--eval-blunder)", glyph: "??", marked: true },
  book: { label: "Teoria", color: "var(--text-muted)", glyph: "", marked: false },
};
