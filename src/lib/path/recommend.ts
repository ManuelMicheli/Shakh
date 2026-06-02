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
        title: `Allena: ${themeLabel(w.key)}`,
        reason: `È il tuo tema tattico più debole (${pct}% di riuscita). Qualche puzzle mirato.`,
        activity: { label: "Vai ai puzzle", href: "/app/tattiche" },
      };
    case "endgame":
      return {
        mode: "autonomous",
        title: "Rinforza i finali",
        reason: `I tuoi finali sono deboli (${pct}%): 15 minuti di pratica contro la tablebase.`,
        activity: {
          label: "Pratica il finale",
          href: `/app/teoria/${ENDGAME_SLUG[w.key] ?? "matti-elementari"}`,
        },
      };
    case "middlegame_theme":
      return {
        mode: "autonomous",
        title: "Lavora sui piani",
        reason: `Le strutture di mediogioco ti costano (${pct}%): rivedi un esercizio posizionale.`,
        activity: { label: "Vai alla teoria", href: "/app/teoria/mediogioco" },
      };
    case "opening":
      return {
        mode: "autonomous",
        title: "Stringi il repertorio",
        reason: `La precisione in apertura cala (${pct}%): un drill di ripasso.`,
        activity: { label: "Allena il repertorio", href: "/app/repertorio" },
      };
    case "phase":
      return {
        mode: "autonomous",
        title: `Migliora il tuo ${w.key === "opening" ? "gioco d'apertura" : w.key === "endgame" ? "finale" : "mediogioco"}`,
        reason: `Dalle tue partite, è la fase dove perdi più valutazione. Allenala.`,
        activity: { label: "Le mie partite", href: "/app/partite" },
      };
    default:
      return {
        mode: "autonomous",
        title: "Allenamento libero",
        reason: "Scegli dove migliorare: il percorso resta come riferimento.",
        activity: { label: "Vai ai puzzle", href: "/app/tattiche" },
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
        reason: node.description ?? "Il prossimo passo del tuo percorso.",
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
      reason: node.description ?? "Continua il percorso o esplora liberamente.",
      activity: node.activities[0] ?? null,
    };
  }
  return null;
}
