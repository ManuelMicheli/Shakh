import Link from "next/link";
import { Lock, Circle, CircleDot, CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PathNodeStatus, PathNodeView } from "@/lib/path/types";

// Icona per stato; l'etichetta è localizzata via chiave i18n in STATUS_LABEL_KEY.
const STATUS_ICON: Record<PathNodeStatus, typeof Circle> = {
  locked: Lock,
  available: Circle,
  in_progress: CircleDot,
  completed: CheckCircle2,
};

const STATUS_LABEL_KEY: Record<PathNodeStatus, string> = {
  locked: "skillTree.status.locked",
  available: "skillTree.status.available",
  in_progress: "skillTree.status.inProgress",
  completed: "skillTree.status.completed",
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
  const t = useTranslations("study");
  const Icon = STATUS_ICON[node.status];
  const label = t(STATUS_LABEL_KEY[node.status]);
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
          {t("skillTree.unlockHint")}
        </p>
      )}
    </div>
  );
}

/** Tappa della timeline mobile: marker di stato sulla spina + scheda a fianco. */
function NodeRow({ node }: { node: PathNodeView }) {
  const t = useTranslations("study");
  const Icon = STATUS_ICON[node.status];
  const label = t(STATUS_LABEL_KEY[node.status]);
  const locked = node.status === "locked";
  const completed = node.status === "completed";

  return (
    <div className="relative flex gap-3">
      <span
        className={cn(
          "relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-full border",
          completed
            ? "border-text bg-text text-bg"
            : "border-border bg-bg text-text-muted",
        )}
      >
        <Icon className="h-[1.05rem] w-[1.05rem]" />
      </span>

      <div
        className={cn(
          "min-w-0 flex-1 rounded-xl border border-border bg-surface p-3",
          locked && "opacity-60",
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="min-w-0 font-display font-medium leading-tight">
            {node.title}
          </h3>
          <span className="shrink-0 text-[10px] uppercase tracking-wide text-text-muted">
            {label}
          </span>
        </div>
        {node.description && (
          <p className="mt-1 text-sm text-text-muted">{node.description}</p>
        )}

        {node.status === "in_progress" && (
          <div className="mt-2 flex items-center gap-2">
            <ProgressBar value={node.progress} />
            <span className="font-mono text-xs text-text-muted">
              {Math.round(node.progress * 100)}%
            </span>
          </div>
        )}

        {!locked && node.activities.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-2">
            {node.activities.map((a) => (
              <Link key={a.href + a.label} href={a.href} className={ACTIVITY_LINK}>
                {a.label}
              </Link>
            ))}
          </div>
        )}

        {locked && node.prerequisites.length > 0 && (
          <p className="mt-2 text-xs text-text-muted">
            {t("skillTree.unlockHint")}
          </p>
        )}
      </div>
    </div>
  );
}

/** Skill tree: nodi raggruppati per livello, con stato e sblocco progressivo. */
export function SkillTree({ nodes }: { nodes: PathNodeView[] }) {
  const t = useTranslations("study");
  const levels = Array.from(new Set(nodes.map((n) => n.level))).sort((a, b) => a - b);
  // Titoli dei livelli noti (0..4); per livelli fuori range si usa il fallback.
  const LEVEL_TITLE_KEYS: Record<number, string> = {
    0: "skillTree.level.0",
    1: "skillTree.level.1",
    2: "skillTree.level.2",
    3: "skillTree.level.3",
    4: "skillTree.level.4",
  };

  return (
    <div className="space-y-8">
      {levels.map((level) => {
        const ofLevel = nodes
          .filter((n) => n.level === level)
          .sort((a, b) => a.order_index - b.order_index);
        const done = ofLevel.filter((n) => n.status === "completed").length;
        const title =
          level in LEVEL_TITLE_KEYS
            ? t(LEVEL_TITLE_KEYS[level])
            : t("skillTree.levelFallback", { level });
        return (
          <section key={level} className="space-y-3">
            {/* MOBILE: intestazione con regola damier. */}
            <div className="flex items-center gap-3 md:hidden">
              <h2 className="font-display text-base font-semibold">{title}</h2>
              <div className="chess-rule h-1 flex-1 opacity-60" />
              <span className="font-mono text-xs text-text-muted">
                {done}/{ofLevel.length}
              </span>
            </div>
            {/* DESKTOP: intestazione classica. */}
            <div className="hidden items-baseline justify-between md:flex">
              <h2 className="font-display text-lg font-semibold">{title}</h2>
              <span className="font-mono text-xs text-text-muted">
                {done}/{ofLevel.length}
              </span>
            </div>

            {/* MOBILE: timeline verticale a tappe. */}
            <div className="relative space-y-3 md:hidden">
              <span
                aria-hidden
                className="absolute bottom-4 left-[17px] top-4 w-px bg-border"
              />
              {ofLevel.map((n) => (
                <NodeRow key={n.id} node={n} />
              ))}
            </div>

            {/* DESKTOP: griglia di schede. */}
            <div className="hidden gap-3 md:grid md:grid-cols-2">
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
