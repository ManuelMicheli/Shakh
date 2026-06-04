"use client";

import {
  Menu,
  Bell,
  Lock,
  Circle,
  CircleDot,
  CheckCircle2,
  Compass,
  ChevronRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * SHOWCASE (dev-only): redesign mobile della pagina Percorso come timeline
 * verticale (spina + tappe), direzione editoriale + texture scacchi. Mock.
 */

type Status = "locked" | "available" | "in_progress" | "completed";

const STATUS: Record<Status, { label: string; Icon: LucideIcon }> = {
  locked: { label: "Locked", Icon: Lock },
  available: { label: "Available", Icon: Circle },
  in_progress: { label: "In progress", Icon: CircleDot },
  completed: { label: "Completed", Icon: CheckCircle2 },
};

type Node = {
  title: string;
  description?: string;
  status: Status;
  progress?: number;
  activities?: string[];
};

const LEVELS: { title: string; nodes: Node[] }[] = [
  {
    title: "Level 1 — Basic tactics",
    nodes: [
      {
        title: "Fork and skewer",
        description: "The double attacks that win material.",
        status: "completed",
        activities: ["Train"],
      },
      {
        title: "Pin",
        description: "Trapping a piece against a more valuable one.",
        status: "in_progress",
        progress: 0.45,
        activities: ["Train", "Theory"],
      },
    ],
  },
  {
    title: "Level 2 — Openings and key endgames",
    nodes: [
      {
        title: "Opening principles",
        description: "Center, development, king safety.",
        status: "available",
        activities: ["Study"],
      },
      {
        title: "King and pawn endgames",
        status: "locked",
      },
    ],
  },
];

export default function PercorsoShowcasePage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Mobile redesign · Path
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          Vertical milestone timeline. Take a look and confirm.
        </p>
      </header>

      <div className="flex justify-center pt-2">
        <PhoneFrame>
          <PhoneChrome />
          <div className="flex-1 overflow-y-auto bg-bg">
            <div className="space-y-5 p-4 pb-10">
              {/* Testata: testo sinistra, glifo re a destra */}
              <div className="relative">
                <div className="relative">
                  <p className="text-xs uppercase tracking-wider text-text-muted">
                    From beginner to club level
                  </p>
                  <h2 className="mt-0.5 font-display text-[1.7rem] font-semibold leading-tight tracking-tight">
                    Path
                  </h2>
                  <p className="mt-2 text-sm text-text-muted">
                    Nodes unlock as you master the previous ones.
                  </p>
                </div>
              </div>

              {/* Prossimo passo */}
              <div className="rounded-xl border border-border bg-surface p-4">
                <span className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-text-muted">
                  <Compass className="h-3.5 w-3.5" /> Next step
                </span>
                <h3 className="mt-2 font-display text-lg font-semibold">
                  Pin
                </h3>
                <p className="mt-1 text-sm text-text-muted">
                  You&apos;re halfway: a focused set drills the pattern.
                </p>
                <button className="mt-3 inline-flex h-10 w-full items-center justify-center gap-1 rounded-lg bg-text text-sm font-medium text-bg">
                  Continue <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {/* Timeline livelli */}
              {LEVELS.map((lvl, li) => {
                const done = lvl.nodes.filter(
                  (n) => n.status === "completed",
                ).length;
                return (
                  <section key={li} className="space-y-3">
                    <div className="flex items-center gap-3">
                      <h2 className="font-display text-base font-semibold">
                        {lvl.title}
                      </h2>
                      <div className="chess-rule h-1 flex-1 opacity-60" />
                      <span className="font-mono text-xs text-text-muted">
                        {done}/{lvl.nodes.length}
                      </span>
                    </div>

                    <div className="relative space-y-3">
                      {/* Spina verticale */}
                      <span
                        aria-hidden
                        className="absolute bottom-4 left-[17px] top-4 w-px bg-border"
                      />
                      {lvl.nodes.map((n, ni) => (
                        <NodeRow key={ni} node={n} />
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        </PhoneFrame>
      </div>
    </div>
  );
}

function NodeRow({ node }: { node: Node }) {
  const { Icon, label } = STATUS[node.status];
  const locked = node.status === "locked";
  const completed = node.status === "completed";

  return (
    <div className="relative flex gap-3">
      {/* Marker sulla spina */}
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

      {/* Contenuto */}
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

        {node.status === "in_progress" && node.progress != null && (
          <div className="mt-2 flex items-center gap-2">
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
              <span
                className="block h-full rounded-full bg-text"
                style={{ width: `${Math.round(node.progress * 100)}%` }}
              />
            </span>
            <span className="font-mono text-xs text-text-muted">
              {Math.round(node.progress * 100)}%
            </span>
          </div>
        )}

        {!locked && node.activities && node.activities.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-2">
            {node.activities.map((a) => (
              <span
                key={a}
                className="inline-flex h-8 items-center rounded-md border border-border px-3 text-sm font-medium hover:bg-surface-2"
              >
                {a}
              </span>
            ))}
          </div>
        )}

        {locked && (
          <p className="mt-2 text-xs text-text-muted">
            Unlock it by completing the previous steps.
          </p>
        )}
      </div>
    </div>
  );
}

/* ---- Cornice telefono ---- */
function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative w-[390px] max-w-full shrink-0 rounded-[2.5rem] border border-border bg-surface p-2 shadow-2xl">
      <div className="relative flex h-[760px] flex-col overflow-hidden rounded-[2rem] border border-border">
        <div className="pointer-events-none absolute left-1/2 top-0 z-20 h-6 w-32 -translate-x-1/2 rounded-b-2xl bg-surface" />
        {children}
      </div>
    </div>
  );
}

function PhoneChrome() {
  return (
    <div className="shrink-0">
      <div className="flex h-14 items-center justify-between bg-surface px-4 pt-2">
        <button type="button" aria-label="Menu" className="-ml-1 rounded-md p-1.5 text-text-muted">
          <Menu className="h-5 w-5" />
        </button>
        <span className="font-display text-lg font-semibold tracking-tight">Shakh</span>
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Notifications" className="rounded-md p-1.5 text-text-muted">
            <Bell className="h-5 w-5" />
          </button>
          <div className="grid h-8 w-8 place-items-center rounded-full bg-text text-xs font-semibold text-bg">
            M
          </div>
        </div>
      </div>
      <div className="chess-rule h-1 w-full" />
    </div>
  );
}
