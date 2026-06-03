import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CLASSIFICATION_META } from "@/lib/analysis/labels";

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
  title: "Statistiche e analisi",
  terms: [
    {
      term: "Accuratezza",
      def: "Quanto le tue mosse si avvicinano a quelle migliori del motore, in percentuale. Più è alta, meglio hai giocato.",
    },
    {
      term: "Rating tattico",
      def: "Un numero che misura la tua forza nei puzzle: sale se risolvi, scende se sbagli (come un punteggio Elo).",
    },
    {
      term: "Streak",
      def: "Quanti puzzle hai risolto di fila senza errori. Il record è la striscia più lunga raggiunta.",
    },
    {
      term: "Pedone / centipawn",
      def: "L'unità di misura del vantaggio. 1 pedone = avere un pezzo leggero in più, all'incirca. Il motore lo misura in centesimi (centipawn).",
    },
    {
      term: "Punto critico",
      def: "La fase di gioco in cui commetti più errori: è lì che conviene allenarsi di più.",
    },
  ],
};

/** Fasi della partita. */
const PHASES: Section = {
  title: "Fasi della partita",
  terms: [
    {
      term: "Apertura",
      def: "Le prime mosse: si sviluppano i pezzi, si controlla il centro e si mette al sicuro il re (arrocco).",
    },
    {
      term: "Mediogioco",
      def: "Il cuore della partita: piani, attacchi e combinazioni con molti pezzi ancora in gioco.",
    },
    {
      term: "Finale",
      def: "La fase con pochi pezzi rimasti, dove i pedoni e il re diventano protagonisti.",
    },
  ],
};

/** Motivi tattici ricorrenti. */
const TACTICS: Section = {
  title: "Tattiche",
  terms: [
    {
      term: "Forchetta",
      def: "Un pezzo attacca due bersagli contemporaneamente: l'avversario ne può salvare uno solo.",
    },
    {
      term: "Inchiodatura",
      def: "Un pezzo non si può muovere perché dietro di lui c'è un pezzo più prezioso (spesso il re).",
    },
    {
      term: "Infilata",
      def: "Come l'inchiodatura al contrario: il pezzo prezioso è davanti e, spostandosi, lascia prendere quello dietro.",
    },
    {
      term: "Scoperta",
      def: "Sposti un pezzo e ne liberi un altro che dà scacco o attacca: due minacce in una mossa.",
    },
    {
      term: "Sacrificio",
      def: "Cedi materiale di proposito per ottenere un vantaggio maggiore (attacco al re, matto, promozione).",
    },
  ],
};

/** Termini generali utili. */
const GENERAL: Section = {
  title: "Concetti di base",
  terms: [
    {
      term: "Arrocco",
      def: "Mossa speciale che muove insieme re e torre, per mettere il re al sicuro.",
    },
    {
      term: "Sviluppo",
      def: "Portare i pezzi (cavalli e alfieri) fuori dalla posizione iniziale verso caselle attive.",
    },
    {
      term: "Iniziativa",
      def: "Avere il controllo del gioco: sei tu a creare minacce e l'avversario deve difendersi.",
    },
    {
      term: "Repertorio",
      def: "L'insieme di aperture che scegli di giocare e impari a memoria.",
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
        <CardTitle>Legenda dei termini</CardTitle>
        <CardDescription>
          Cosa significano le parole che trovi nella dashboard e nell&apos;analisi.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Qualità delle mosse: riusa le stesse etichette/colori dell'analisi. */}
        <details className="rounded-md border border-border bg-surface px-3 py-2">
          <summary className="cursor-pointer text-sm font-medium text-text">
            Qualità delle mosse
          </summary>
          <ul className="mt-3 space-y-1.5">
            {(
              ["brilliant", "best", "good", "inaccuracy", "mistake", "blunder", "book"] as const
            ).map((k) => {
              const m = CLASSIFICATION_META[k];
              return (
                <li key={k} className="flex items-baseline gap-2 text-xs">
                  <span
                    className="min-w-[5.5rem] shrink-0 font-medium"
                    style={{ color: m.color }}
                  >
                    {m.glyph && <span className="font-mono">{m.glyph} </span>}
                    {m.label}
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
