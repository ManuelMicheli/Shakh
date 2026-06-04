/**
 * "Prossimo passo": guida adattiva → autonomia (prompt 07, §5).
 *
 * - Livelli bassi (0–2): binario. Il prossimo passo è il prossimo nodo
 *   disponibile del curriculum.
 * - Dal livello 3 (fondamentali acquisiti): raccomandazione basata sui DATI.
 *   Si usa il punto più debole in `user_progress` per proporre un allenamento
 *   mirato, col percorso che resta riferimento (non gabbia) e la modalità libera
 *   in evidenza. Nessuna nuova logica AI: solo dati già raccolti.
 *
 * Funzioni pure: la Server Action passa i dati già letti dal DB.
 */
import { themeLabel } from "@/lib/tactics/themes";
import type { Locale } from "@/i18n/config";
import type { PathActivity, PathNodeView } from "./types";

/** Soglia: da questo livello in poi la guida diventa autonomia. */
export const AUTONOMY_LEVEL = 3;

/** Riga debole di `user_progress` da cui derivare una raccomandazione. */
export interface WeakSpot {
  dimension: string;
  key: string;
  score: number;
  attempts: number;
}

export interface NextStep {
  mode: "guided" | "autonomous";
  title: string;
  reason: string;
  activity: PathActivity | null;
}

/** Finali noti → lezione collegata (deep link); fallback alla teoria. */
const ENDGAME_SLUG: Record<string, string> = {
  kq_vs_k: "matti-elementari",
  kp_vs_k: "re-e-pedone-contro-re",
  q_vs_p: "donna-contro-pedone",
  lucena: "posizione-di-lucena",
  philidor: "posizione-di-philidor",
};

/** Traduce un punto debole in un'attività concreta + frase di motivazione dai dati. */
function weakSpotToStep(w: WeakSpot, locale: Locale): NextStep {
  const pct = Math.round(w.score * 100);
  const it = locale === "it";
  switch (w.dimension) {
    case "tactic_theme":
      return {
        mode: "autonomous",
        title: it ? `Allena: ${themeLabel(w.key, locale)}` : `Train: ${themeLabel(w.key, locale)}`,
        reason: it
          ? `È il tuo tema tattico più debole (${pct}% di successi). Qualche puzzle mirato.`
          : `It's your weakest tactical theme (${pct}% success). A few targeted puzzles.`,
        activity: {
          label: it ? "Vai ai puzzle" : "Go to puzzles",
          href: "/app/tattiche",
        },
      };
    case "endgame":
      return {
        mode: "autonomous",
        title: it ? "Consolida i finali" : "Shore up your endgames",
        reason: it
          ? `I tuoi finali sono deboli (${pct}%): 15 minuti di pratica contro la tablebase.`
          : `Your endgames are weak (${pct}%): 15 minutes of practice against the tablebase.`,
        activity: {
          label: it ? "Allena il finale" : "Practice the endgame",
          href: `/app/teoria/${ENDGAME_SLUG[w.key] ?? "matti-elementari"}`,
        },
      };
    case "middlegame_theme":
      return {
        mode: "autonomous",
        title: it ? "Lavora sui piani" : "Work on your plans",
        reason: it
          ? `Le strutture di mediogioco ti costano (${pct}%): rivedi un esercizio posizionale.`
          : `Middlegame structures cost you (${pct}%): review a positional exercise.`,
        activity: {
          label: it ? "Vai alla teoria" : "Go to theory",
          href: "/app/teoria/mediogioco",
        },
      };
    case "opening":
      return {
        mode: "autonomous",
        title: it ? "Rifinisci il repertorio" : "Tighten your repertoire",
        reason: it
          ? `La precisione in apertura cala (${pct}%): un drill di ripasso.`
          : `Your opening accuracy is dropping (${pct}%): a review drill.`,
        activity: {
          label: it ? "Allena il repertorio" : "Train the repertoire",
          href: "/app/repertorio",
        },
      };
    case "phase": {
      const phaseIt =
        w.key === "opening" ? "l'apertura" : w.key === "endgame" ? "il finale" : "il mediogioco";
      const phaseEn =
        w.key === "opening" ? "opening play" : w.key === "endgame" ? "endgame" : "middlegame";
      return {
        mode: "autonomous",
        title: it ? `Migliora ${phaseIt}` : `Improve your ${phaseEn}`,
        reason: it
          ? `Dalle tue partite, è la fase dove perdi più valutazione. Allenala.`
          : `From your games, it's the phase where you lose the most evaluation. Train it.`,
        activity: { label: it ? "Le mie partite" : "My games", href: "/app/partite" },
      };
    }
    default:
      return {
        mode: "autonomous",
        title: it ? "Allenamento libero" : "Free training",
        reason: it
          ? "Scegli dove migliorare: il percorso resta come riferimento."
          : "Choose where to improve: the path stays as a reference.",
        activity: {
          label: it ? "Vai ai puzzle" : "Go to puzzles",
          href: "/app/tattiche",
        },
      };
  }
}

/** Prossimo nodo su cui lavorare (disponibile o in corso, più in basso nel percorso). */
function nextOpenNode(nodes: PathNodeView[]): PathNodeView | null {
  const open = nodes
    .filter((n) => n.status === "in_progress" || n.status === "available")
    .sort((a, b) => a.level - b.level || a.order_index - b.order_index);
  return open[0] ?? null;
}

/**
 * Calcola il "prossimo passo". Sotto `AUTONOMY_LEVEL` segue il curriculum;
 * sopra, se ci sono dati, raccomanda sul punto debole; altrimenti ripiega
 * sul prossimo nodo aperto.
 */
export function computeNextStep(
  currentLevel: number,
  nodes: PathNodeView[],
  weakest: WeakSpot | null,
  locale: Locale = "en",
): NextStep | null {
  const guided = currentLevel < AUTONOMY_LEVEL;
  const it = locale === "it";

  if (guided) {
    const node = nextOpenNode(nodes);
    if (node) {
      return {
        mode: "guided",
        title: node.title,
        reason: node.description ?? (it ? "Il prossimo passo del tuo percorso." : "The next step on your path."),
        activity: node.activities[0] ?? null,
      };
    }
    // Niente nodi aperti (tutto completato o tutto bloccato): nessun binario.
  }

  // Autonomia: raccomanda sui dati se ci sono, altrimenti prossimo nodo aperto.
  if (weakest && weakest.attempts > 0) return weakSpotToStep(weakest, locale);

  const node = nextOpenNode(nodes);
  if (node) {
    return {
      mode: guided ? "guided" : "autonomous",
      title: node.title,
      reason: node.description ?? (it ? "Continua il percorso o esplora liberamente." : "Continue the path or explore freely."),
      activity: node.activities[0] ?? null,
    };
  }
  return null;
}
