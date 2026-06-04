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
function weakSpotToStep(w: WeakSpot): NextStep {
  const pct = Math.round(w.score * 100);
  switch (w.dimension) {
    case "tactic_theme":
      return {
        mode: "autonomous",
        title: `Train: ${themeLabel(w.key)}`,
        reason: `It's your weakest tactical theme (${pct}% success). A few targeted puzzles.`,
        activity: { label: "Go to puzzles", href: "/app/tattiche" },
      };
    case "endgame":
      return {
        mode: "autonomous",
        title: "Shore up your endgames",
        reason: `Your endgames are weak (${pct}%): 15 minutes of practice against the tablebase.`,
        activity: {
          label: "Practice the endgame",
          href: `/app/teoria/${ENDGAME_SLUG[w.key] ?? "matti-elementari"}`,
        },
      };
    case "middlegame_theme":
      return {
        mode: "autonomous",
        title: "Work on your plans",
        reason: `Middlegame structures cost you (${pct}%): review a positional exercise.`,
        activity: { label: "Go to theory", href: "/app/teoria/mediogioco" },
      };
    case "opening":
      return {
        mode: "autonomous",
        title: "Tighten your repertoire",
        reason: `Your opening accuracy is dropping (${pct}%): a review drill.`,
        activity: { label: "Train the repertoire", href: "/app/repertorio" },
      };
    case "phase":
      return {
        mode: "autonomous",
        title: `Improve your ${w.key === "opening" ? "opening play" : w.key === "endgame" ? "endgame" : "middlegame"}`,
        reason: `From your games, it's the phase where you lose the most evaluation. Train it.`,
        activity: { label: "My games", href: "/app/partite" },
      };
    default:
      return {
        mode: "autonomous",
        title: "Free training",
        reason: "Choose where to improve: the path stays as a reference.",
        activity: { label: "Go to puzzles", href: "/app/tattiche" },
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
): NextStep | null {
  const guided = currentLevel < AUTONOMY_LEVEL;

  if (guided) {
    const node = nextOpenNode(nodes);
    if (node) {
      return {
        mode: "guided",
        title: node.title,
        reason: node.description ?? "The next step on your path.",
        activity: node.activities[0] ?? null,
      };
    }
    // Niente nodi aperti (tutto completato o tutto bloccato): nessun binario.
  }

  // Autonomia: raccomanda sui dati se ci sono, altrimenti prossimo nodo aperto.
  if (weakest && weakest.attempts > 0) return weakSpotToStep(weakest);

  const node = nextOpenNode(nodes);
  if (node) {
    return {
      mode: guided ? "guided" : "autonomous",
      title: node.title,
      reason: node.description ?? "Continue the path or explore freely.",
      activity: node.activities[0] ?? null,
    };
  }
  return null;
}
