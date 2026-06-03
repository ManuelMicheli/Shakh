/**
 * Scala dei concetti (Fase 8): micro-percorso per principianti, un concetto alla
 * volta. Ogni concetto = una spiegazione breve + alcuni puzzle facili del tema
 * corrispondente (riconoscere → sfruttare). I puzzle arrivano dal dataset reale
 * (nessuna posizione inventata a mano), serviti a difficoltà bassa.
 *
 * Dati statici, importabili sia lato server sia client.
 */

export interface Concept {
  slug: string;
  title: string;
  /** Tema puzzle Lichess da cui pescare gli esercizi. */
  theme: string;
  /** Spiegazione (2-3 frasi, italiano). */
  intro: string;
  /** Cosa deve fare l'utente nei puzzle. */
  goal: string;
}

export const CONCEPTS: Concept[] = [
  {
    slug: "forchetta",
    title: "La forchetta",
    theme: "fork",
    intro:
      "Una forchetta è quando un solo pezzo attacca due (o più) bersagli nello stesso momento. L'avversario può salvarne uno solo: l'altro è tuo. Il cavallo è il maestro delle forchette, perché colpisce dove gli altri pezzi non arrivano.",
    goal: "Trova la mossa che attacca due pezzi insieme.",
  },
  {
    slug: "inchiodatura",
    title: "L'inchiodatura",
    theme: "pin",
    intro:
      "Un pezzo è inchiodato quando non può muoversi perché dietro di lui c'è un pezzo più prezioso (spesso il Re). Inchiodare significa paralizzare un pezzo avversario e poi attaccarlo con calma.",
    goal: "Inchioda un pezzo avversario o sfrutta un'inchiodatura.",
  },
  {
    slug: "infilzata",
    title: "L'infilzata",
    theme: "skewer",
    intro:
      "L'infilzata è l'inchiodatura al contrario: davanti c'è il pezzo prezioso, che è costretto a spostarsi, lasciando catturare quello dietro. Funziona benissimo con pezzi che agiscono in linea: Donna, Torre e Alfiere.",
    goal: "Attacca un pezzo prezioso per vincere quello dietro.",
  },
  {
    slug: "pezzo-in-presa",
    title: "Il pezzo in presa",
    theme: "hangingPiece",
    intro:
      "Prima di ogni mossa, chiediti: c'è un pezzo avversario non difeso? Catturare materiale gratis è il modo più semplice di vincere una partita. L'occhio per i pezzi in presa è la prima abilità del giocatore.",
    goal: "Cattura il pezzo non difeso.",
  },
  {
    slug: "matto-in-uno",
    title: "Matto in una mossa",
    theme: "mateIn1",
    intro:
      "Lo scacco matto è scacco al Re senza via di scampo: la partita finisce. Imparare a vedere il matto in una mossa allena l'occhio a riconoscere quando il Re avversario è in trappola.",
    goal: "Dai scacco matto in una mossa.",
  },
  {
    slug: "matto-corridoio",
    title: "Il matto del corridoio",
    theme: "backRankMate",
    intro:
      "Il Re arroccato dietro ai suoi pedoni può restare intrappolato sull'ultima traversa: una Torre o una Donna che arriva in fondo dà matto perché il Re non ha caselle di fuga. Per questo si gioca spesso 'la presa d'aria' al pedone.",
    goal: "Sfrutta l'ultima traversa per dare matto.",
  },
];

export function findConcept(slug: string): Concept | undefined {
  return CONCEPTS.find((c) => c.slug === slug);
}
