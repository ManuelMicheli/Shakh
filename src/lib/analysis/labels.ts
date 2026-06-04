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
    label: "Brilliant",
    color: "var(--eval-brilliant)",
    glyph: "!!",
    marked: true,
    description: "An exceptional move, often a sacrifice that is hard to find.",
  },
  great: {
    label: "Great",
    color: "var(--eval-great)",
    glyph: "!",
    marked: true,
    description: "A strong, almost unique move: you found it and it changes the game.",
  },
  book: {
    label: "Book",
    color: "var(--eval-book)",
    glyph: "",
    icon: "book",
    marked: false,
    description: "A known move from the opening manuals.",
  },
  best: {
    label: "Best",
    color: "var(--eval-best)",
    glyph: "",
    icon: "star",
    marked: true,
    description: "The best move possible according to the engine.",
  },
  excellent: {
    label: "Excellent",
    color: "var(--eval-excellent)",
    glyph: "",
    icon: "check-double",
    marked: false,
    description: "Nearly perfect: practically on par with the best move.",
  },
  good: {
    label: "Good",
    color: "var(--eval-good)",
    glyph: "",
    icon: "check",
    marked: false,
    description: "A solid move: not the best, but it loses nothing.",
  },
  inaccuracy: {
    label: "Inaccuracy",
    color: "var(--eval-inaccuracy)",
    glyph: "?!",
    marked: true,
    description: "A small mistake: it worsens the position a little.",
  },
  mistake: {
    label: "Mistake",
    color: "var(--eval-mistake)",
    glyph: "?",
    marked: true,
    description: "A serious error: it hands the opponent an important advantage.",
  },
  miss: {
    label: "Miss",
    color: "var(--eval-miss)",
    glyph: "",
    icon: "cross",
    marked: true,
    description: "You missed a winning chance you had available.",
  },
  blunder: {
    label: "Blunder",
    color: "var(--eval-blunder)",
    glyph: "??",
    marked: true,
    description: "A grave oversight: it can change the outcome of the game.",
  },
};
