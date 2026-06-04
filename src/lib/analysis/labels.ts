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
import type { Locale } from "@/i18n/config";

/** Coppia di stringhe bilingue (italiano / inglese). */
export type Bilingual = { it: string; en: string };

/** Risolve una coppia bilingue nella lingua richiesta. */
export function pickBilingual(value: Bilingual, locale: Locale): string {
  return locale === "it" ? value.it : value.en;
}

/** Disegno del badge: un simbolo testuale (NAG) o un'icona vettoriale. */
export type BadgeIcon = "book" | "star" | "check" | "check-double" | "cross";

export interface ClassificationMeta {
  /**
   * Etichetta in inglese (default storico). Per la versione localizzata usa
   * `classificationLabel(key, locale)`.
   */
  label: string;
  /** Variabile CSS del colore semantico. */
  color: string;
  /** Glifo in stile annotazione scacchistica (NAG), per i badge testuali. */
  glyph: string;
  /** Icona vettoriale, quando il badge non è un simbolo testuale. */
  icon?: BadgeIcon;
  /** Se mostrare un marcatore accanto alla mossa nella lista. */
  marked: boolean;
  /**
   * Spiegazione in parole semplici, in inglese (default storico). Per la
   * versione localizzata usa `classificationDescription(key, locale)`.
   */
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

// ──────────────────────────── Versioni bilingue ────────────────────────────
// `CLASSIFICATION_META` resta in inglese per compatibilità con i consumatori
// esistenti (badge, grafici). Qui sotto le coppie IT/EN e gli accessor
// locale-aware che i componenti possono adottare incrementalmente.

interface ClassificationI18n {
  label: Bilingual;
  description: Bilingual;
}

export const CLASSIFICATION_I18N: Record<Classification, ClassificationI18n> = {
  brilliant: {
    label: { it: "Geniale", en: "Brilliant" },
    description: {
      it: "Mossa eccezionale, spesso un sacrificio difficile da trovare.",
      en: "An exceptional move, often a sacrifice that is hard to find.",
    },
  },
  great: {
    label: { it: "Grande", en: "Great" },
    description: {
      it: "Mossa forte e quasi unica: l'hai trovata e cambia la partita.",
      en: "A strong, almost unique move: you found it and it changes the game.",
    },
  },
  book: {
    label: { it: "Libro", en: "Book" },
    description: {
      it: "Mossa nota dei manuali d'apertura.",
      en: "A known move from the opening manuals.",
    },
  },
  best: {
    label: { it: "Migliore", en: "Best" },
    description: {
      it: "La mossa migliore possibile secondo il motore.",
      en: "The best move possible according to the engine.",
    },
  },
  excellent: {
    label: { it: "Ottima", en: "Excellent" },
    description: {
      it: "Quasi perfetta: praticamente alla pari con la migliore.",
      en: "Nearly perfect: practically on par with the best move.",
    },
  },
  good: {
    label: { it: "Buona", en: "Good" },
    description: {
      it: "Mossa solida: non la migliore, ma non perde nulla.",
      en: "A solid move: not the best, but it loses nothing.",
    },
  },
  inaccuracy: {
    label: { it: "Imprecisione", en: "Inaccuracy" },
    description: {
      it: "Piccolo errore: peggiora un po' la posizione.",
      en: "A small mistake: it worsens the position a little.",
    },
  },
  mistake: {
    label: { it: "Errore", en: "Mistake" },
    description: {
      it: "Errore serio: regala un vantaggio importante all'avversario.",
      en: "A serious error: it hands the opponent an important advantage.",
    },
  },
  miss: {
    label: { it: "Mossa mancata", en: "Miss" },
    description: {
      it: "Hai mancato un'occasione vincente che avevi a disposizione.",
      en: "You missed a winning chance you had available.",
    },
  },
  blunder: {
    label: { it: "Errore grave", en: "Blunder" },
    description: {
      it: "Svista grave: può cambiare l'esito della partita.",
      en: "A grave oversight: it can change the outcome of the game.",
    },
  },
};

/** Etichetta localizzata di una classificazione. */
export function classificationLabel(key: Classification, locale: Locale): string {
  return pickBilingual(CLASSIFICATION_I18N[key].label, locale);
}

/** Descrizione localizzata di una classificazione. */
export function classificationDescription(
  key: Classification,
  locale: Locale,
): string {
  return pickBilingual(CLASSIFICATION_I18N[key].description, locale);
}
