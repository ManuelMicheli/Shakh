/**
 * Etichette, glifi e colori semantici per le classificazioni.
 * I colori sono i `--eval-*` del prompt 00: UNICA eccezione al monocromatico,
 * ammessi solo nel contesto dell'analisi delle mosse.
 *
 * Tassonomia e badge ricalcano la scheda di riferimento (stile review):
 * Geniale · Grande · Libro · Migliore · Ottima · Buona · Imprecisione ·
 * Errore · Mossa mancata · Errore grave.
 */

import type { Classification } from "@/lib/games/types";

/** Disegno del badge: un simbolo testuale (NAG) o un'icona vettoriale. */
export type BadgeIcon = "book" | "star" | "check" | "check-double" | "cross";

export interface ClassificationMeta {
  label: string;
  /** Variabile CSS del colore semantico. */
  color: string;
  /** Glifo in stile annotazione scacchistica (NAG), per i badge testuali. */
  glyph: string;
  /** Icona vettoriale, quando il badge non è un simbolo testuale. */
  icon?: BadgeIcon;
  /** Se mostrare un marcatore accanto alla mossa nella lista. */
  marked: boolean;
  /** Spiegazione in parole semplici, per i principianti. */
  description: string;
}

export const CLASSIFICATION_META: Record<Classification, ClassificationMeta> = {
  brilliant: {
    label: "Geniale",
    color: "var(--eval-brilliant)",
    glyph: "!!",
    marked: true,
    description: "Mossa eccezionale, spesso un sacrificio difficile da trovare.",
  },
  great: {
    label: "Grande",
    color: "var(--eval-great)",
    glyph: "!",
    marked: true,
    description: "Mossa forte e quasi unica: l'hai trovata e cambia la partita.",
  },
  book: {
    label: "Libro",
    color: "var(--eval-book)",
    glyph: "",
    icon: "book",
    marked: false,
    description: "Mossa nota dei manuali d'apertura.",
  },
  best: {
    label: "Migliore",
    color: "var(--eval-best)",
    glyph: "",
    icon: "star",
    marked: true,
    description: "La mossa migliore possibile secondo il motore.",
  },
  excellent: {
    label: "Ottima",
    color: "var(--eval-excellent)",
    glyph: "",
    icon: "check-double",
    marked: false,
    description: "Quasi perfetta: praticamente alla pari con la migliore.",
  },
  good: {
    label: "Buona",
    color: "var(--eval-good)",
    glyph: "",
    icon: "check",
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
  miss: {
    label: "Mossa mancata",
    color: "var(--eval-miss)",
    glyph: "",
    icon: "cross",
    marked: true,
    description: "Hai mancato un'occasione vincente che avevi a disposizione.",
  },
  blunder: {
    label: "Errore grave",
    color: "var(--eval-blunder)",
    glyph: "??",
    marked: true,
    description: "Svista grave: può cambiare l'esito della partita.",
  },
};
