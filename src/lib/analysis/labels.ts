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
  /** Spiegazione in parole semplici, per i principianti. */
  description: string;
}

export const CLASSIFICATION_META: Record<Classification, ClassificationMeta> = {
  brilliant: {
    label: "Brillante",
    color: "var(--eval-brilliant)",
    glyph: "!!",
    marked: false,
    description: "Mossa eccezionale, spesso un sacrificio difficile da trovare.",
  },
  best: {
    label: "Migliore",
    color: "var(--eval-best)",
    glyph: "!",
    marked: true,
    description: "La mossa migliore possibile secondo il motore.",
  },
  good: {
    label: "Buona",
    color: "var(--eval-good)",
    glyph: "",
    marked: false,
    description: "Mossa solida: non la migliore, ma non perde nulla.",
  },
  inaccuracy: {
    label: "Imprecisione",
    color: "var(--eval-inaccuracy)",
    glyph: "?!",
    marked: true,
    description: "Piccolo errore: peggiora un po' la posizione.",
  },
  mistake: {
    label: "Errore",
    color: "var(--eval-mistake)",
    glyph: "?",
    marked: true,
    description: "Errore serio: regala un vantaggio importante all'avversario.",
  },
  blunder: {
    label: "Grave errore",
    color: "var(--eval-blunder)",
    glyph: "??",
    marked: true,
    description: "Svista grave: può cambiare l'esito della partita.",
  },
  book: {
    label: "Teoria",
    color: "var(--text-muted)",
    glyph: "",
    marked: false,
    description: "Mossa nota dei manuali d'apertura.",
  },
};
