import Link from "next/link";
import { Lock, Circle, CircleDot, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PathNodeStatus, PathNodeView } from "@/lib/path/types";

const LEVEL_TITLES: Record<number, string> = {
  0: "Livello 0 — Fondamenta",
  1: "Livello 1 — Tattica di base",
  2: "Livello 2 — Apertura e finali chiave",
  3: "Livello 3 — Mediogioco",
  4: "Livello 4 — Verso il club",
};

const STATUS_META: Record<
  PathNodeStatus,
  { label: string; Icon: typeof Circle }
> = {
  locked: { label: "Bloccato", Icon: Lock },
  available: { label: "Disponibile", Icon: Circle },
  in_progress: { label: "In corso", Icon: CircleDot },
  completed: { label: "Completato", Icon: CheckCircle2 },
};

const ACTIVITY_LINK =
  "inline-flex h-8 items-center rounded-md border border-border px-3 text-sm font-medium text-text hover:bg-surface-2";

/** Barra di avanzamento monocroma (niente colori: identità bianco/nero). */
function ProgressBar({ value }: { value: number }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2" aria-hidden>
      <div className="h-full rounded-full bg-text" style={{ width: `${pct}%` }} />
    </div>
  );
}

function NodeCard({ node }: { node: PathNodeView }) {
  const { Icon, label } = STATUS_META[node.status];
  const locked = node.status === "locked";
  const completed = node.status === "completed";
  const inProgress = node.status === "in_progress";

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-surface p-4",
        locked && "opacity-60",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", completed ? "text-text" : "text-text-muted")} />
          <div>
            <h3 className="font-display font-medium leading-tight">{node.title}</h3>
            {node.description && (
              <p className="mt-1 text-sm text-text-muted">{node.description}</p>
            )}
          </div>
        </div>
        <Badge variant={completed ? "default" : "muted"}>{label}</Badge>
      </div>

      {inProgress && (
        <div className="mt-3 flex items-center gap-2">
          <ProgressBar value={node.progress} />
          <span className="font-mono text-xs text-text-muted">
            {Math.round(node.progress * 100)}%
          </span>
        </div>
      )}

      {!locked && node.activities.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {node.activities.map((a) => (
            <Link key={a.href + a.label} href={a.href} className={ACTIVITY_LINK}>
              {a.label}
            </Link>
          ))}
        </div>
      )}

      {locked && node.prerequisites.length > 0 && (
        <p className="mt-3 text-xs text-text-muted">
          Sblocca completando i passi precedenti.
        </p>
      )}
    </div>
  );
}

/** Skill tree: nodi raggruppati per livello, con stato e sblocco progressivo. */
export function SkillTree({ nodes }: { nodes: PathNodeView[] }) {
  const levels = Array.from(new Set(nodes.map((n) => n.level))).sort((a, b) => a - b);

  return (
    <div className="space-y-8">
      {levels.map((level) => {
        const ofLevel = nodes
          .filter((n) => n.level === level)
          .sort((a, b) => a.order_index - b.order_index);
        const done = ofLevel.filter((n) => n.status === "completed").length;
        return (
          <section key={level} className="space-y-3">
            <div className="flex items-baseline justify-between">
              <h2 className="font-display text-lg font-semibold">
                {LEVEL_TITLES[level] ?? `Livello ${level}`}
              </h2>
              <span className="font-mono text-xs text-text-muted">
                {done}/{ofLevel.length}
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {ofLevel.map((n) => (
                <NodeCard key={n.id} node={n} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
