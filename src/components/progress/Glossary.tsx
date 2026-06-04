import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CLASSIFICATION_META } from "@/lib/analysis/labels";
import { MoveBadge } from "@/components/analysis/MoveBadge";
import { CLASSIFICATION_ORDER } from "@/lib/games/types";

interface Term {
  term: string;
  def: string;
}

interface Section {
  title: string;
  terms: Term[];
}

/** Termini delle statistiche mostrate nella dashboard. */
const METRICS: Section = {
  title: "Statistics and analysis",
  terms: [
    {
      term: "Accuracy",
      def: "How close your moves are to the engine's best ones, as a percentage. The higher it is, the better you played.",
    },
    {
      term: "Tactical rating",
      def: "A number measuring your strength in puzzles: it goes up when you solve them, down when you miss (like an Elo score).",
    },
    {
      term: "Streak",
      def: "How many puzzles you've solved in a row without mistakes. The best is the longest streak you've reached.",
    },
    {
      term: "Pawn / centipawn",
      def: "The unit for measuring an advantage. 1 pawn ≈ having one extra minor piece, roughly. The engine measures it in hundredths (centipawns).",
    },
    {
      term: "Critical area",
      def: "The phase of the game where you make the most mistakes: that's where it pays to train more.",
    },
  ],
};

/** Fasi della partita. */
const PHASES: Section = {
  title: "Phases of the game",
  terms: [
    {
      term: "Opening",
      def: "The first moves: you develop your pieces, control the center, and get your king to safety (castling).",
    },
    {
      term: "Middlegame",
      def: "The heart of the game: plans, attacks, and combinations with many pieces still on the board.",
    },
    {
      term: "Endgame",
      def: "The phase with few pieces left, where the pawns and the king take center stage.",
    },
  ],
};

/** Motivi tattici ricorrenti. */
const TACTICS: Section = {
  title: "Tactics",
  terms: [
    {
      term: "Fork",
      def: "One piece attacks two targets at once: your opponent can only save one of them.",
    },
    {
      term: "Pin",
      def: "A piece can't move because behind it sits a more valuable piece (often the king).",
    },
    {
      term: "Skewer",
      def: "Like a pin in reverse: the valuable piece is in front and, when it moves, leaves the one behind it to be captured.",
    },
    {
      term: "Discovered attack",
      def: "You move one piece and free another that gives check or attacks: two threats in one move.",
    },
    {
      term: "Sacrifice",
      def: "You give up material on purpose to gain a bigger advantage (an attack on the king, mate, promotion).",
    },
  ],
};

/** Termini generali utili. */
const GENERAL: Section = {
  title: "Basic concepts",
  terms: [
    {
      term: "Castling",
      def: "A special move that moves the king and rook together, to bring the king to safety.",
    },
    {
      term: "Development",
      def: "Bringing your pieces (knights and bishops) out of their starting squares to active ones.",
    },
    {
      term: "Initiative",
      def: "Having control of the game: you're the one creating threats and your opponent has to defend.",
    },
    {
      term: "Repertoire",
      def: "The set of openings you choose to play and learn by heart.",
    },
  ],
};

const SECTIONS: Section[] = [METRICS, PHASES, TACTICS, GENERAL];

/**
 * Legenda dei termini scacchistici per la dashboard (prompt 08).
 * Riferimento sempre a portata di mano per i principianti: spiega in parole
 * semplici i termini usati nelle statistiche, nell'analisi e nel percorso.
 */
export function Glossary() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Glossary of terms</CardTitle>
        <CardDescription>
          What the words you see in the dashboard and the analysis mean.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Qualità delle mosse: riusa le stesse etichette/colori dell'analisi. */}
        <details className="rounded-md border border-border bg-surface px-3 py-2">
          <summary className="cursor-pointer text-sm font-medium text-text">
            Move quality
          </summary>
          <ul className="mt-3 space-y-1.5">
            {CLASSIFICATION_ORDER.map((k) => {
              const m = CLASSIFICATION_META[k];
              return (
                <li key={k} className="flex items-baseline gap-2 text-xs">
                  <span className="flex min-w-[6.5rem] shrink-0 items-center gap-1.5 font-medium">
                    <MoveBadge classification={k} size={15} />
                    <span style={{ color: m.color }}>{m.label}</span>
                  </span>
                  <span className="text-text-muted">{m.description}</span>
                </li>
              );
            })}
          </ul>
        </details>

        {SECTIONS.map((section) => (
          <details key={section.title} className="rounded-md border border-border bg-surface px-3 py-2">
            <summary className="cursor-pointer text-sm font-medium text-text">
              {section.title}
            </summary>
            <dl className="mt-3 space-y-2.5">
              {section.terms.map((t) => (
                <div key={t.term} className="text-xs">
                  <dt className="font-medium text-text">{t.term}</dt>
                  <dd className="mt-0.5 leading-snug text-text-muted">{t.def}</dd>
                </div>
              ))}
            </dl>
          </details>
        ))}
      </CardContent>
    </Card>
  );
}
