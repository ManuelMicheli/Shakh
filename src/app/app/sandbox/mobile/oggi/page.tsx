"use client";

import {
  Menu,
  Bell,
  RotateCcw,
  Crosshair,
  Target,
  Flag,
  Library,
  ChevronRight,
  Check,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlyphWatermark } from "@/components/layout/GlyphWatermark";

/**
 * SHOWCASE (dev-only): redesign mobile della pagina "Oggi", stessa direzione
 * approvata per la Dashboard (editoriale + texture scacchi). Dati finti.
 */

type Kind = "review" | "weakness" | "tactics" | "endgame" | "repertoire";

const ICON: Record<Kind, LucideIcon> = {
  review: RotateCcw,
  weakness: Crosshair,
  tactics: Target,
  endgame: Flag,
  repertoire: Library,
};

const PLAN = {
  date: "Mercoledì 3 giugno",
  totalMin: 25,
  blocks: [
    {
      kind: "review" as Kind,
      title: "Ripasso",
      detail: "8 puzzle in scadenza da rivedere",
      done: 8,
      target: 8,
      estMin: 5,
    },
    {
      kind: "weakness" as Kind,
      title: "Punto debole: Inchiodatura",
      detail: "Competenza 41% — alleniamola",
      done: 2,
      target: 6,
      estMin: 5,
    },
    {
      kind: "tactics" as Kind,
      title: "Tattica adattiva",
      detail: "Puzzle calibrati sul tuo livello",
      done: 0,
      target: 8,
      estMin: 5,
    },
    {
      kind: "endgame" as Kind,
      title: "Finale: Re e pedone",
      detail: "Converti contro la difesa perfetta",
      done: 0,
      target: 1,
      estMin: 5,
    },
    {
      kind: "repertoire" as Kind,
      title: "Ripasso repertorio",
      detail: "12 mosse in scadenza",
      done: 0,
      target: 12,
      estMin: 5,
    },
  ],
};

export default function OggiShowcasePage() {
  const doneCount = PLAN.blocks.filter((b) => b.done >= b.target).length;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Redesign mobile · Oggi
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          Stessa direzione della Dashboard. Guarda, poi la applico alla pagina
          reale.
        </p>
      </header>

      <div className="flex justify-center pt-2">
        <PhoneFrame>
          <PhoneChrome />
          <div className="flex-1 overflow-y-auto bg-bg">
            <div className="space-y-5 p-4 pb-10">
              {/* Testata editoriale con glifo pedone watermark */}
              <div className="relative">
                <GlyphWatermark glyph="♟" />
                <div className="relative">
                  <p className="text-xs uppercase tracking-wider text-text-muted">
                    {PLAN.date}
                  </p>
                  <h2 className="mt-0.5 font-display text-2xl font-semibold tracking-tight">
                    Oggi
                  </h2>

                  <div className="mt-6 flex items-end gap-2">
                    <span className="font-mono text-5xl font-semibold tabular-nums tracking-tight">
                      ~{PLAN.totalMin}
                      <span className="text-3xl">′</span>
                    </span>
                  </div>
                  <p className="mt-1 text-xs uppercase tracking-wide text-text-muted">
                    durata stimata · {doneCount}/{PLAN.blocks.length} completati
                  </p>
                </div>
              </div>

              {/* Divisore damier */}
              <div className="chess-rule h-1 w-full opacity-70" />

              {/* Il piano */}
              <section className="space-y-2">
                <p className="px-0.5 text-[0.7rem] font-medium uppercase tracking-wider text-text-muted/70">
                  Il piano
                </p>
                <div className="space-y-2">
                  {PLAN.blocks.map((b) => (
                    <BlockCard key={b.kind} block={b} />
                  ))}
                </div>
              </section>
            </div>
          </div>
        </PhoneFrame>
      </div>
    </div>
  );
}

function BlockCard({
  block,
}: {
  block: {
    kind: Kind;
    title: string;
    detail: string;
    done: number;
    target: number;
    estMin: number;
  };
}) {
  const done = block.done >= block.target;
  const pct =
    block.target > 0
      ? Math.min(100, Math.round((block.done / block.target) * 100))
      : 0;
  const Icon = ICON[block.kind];

  return (
    <button
      type="button"
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border border-border bg-surface p-3 text-left transition-colors hover:bg-surface-2",
        done && "opacity-70",
      )}
    >
      <span
        className={cn(
          "grid h-9 w-9 shrink-0 place-items-center rounded-lg",
          done ? "bg-text text-bg" : "bg-surface-2 text-text",
        )}
      >
        {done ? (
          <Check className="h-[1.05rem] w-[1.05rem]" />
        ) : (
          <Icon className="h-[1.05rem] w-[1.05rem]" />
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium">{block.title}</span>
          <span className="shrink-0 font-mono text-[11px] text-text-muted">
            {block.done}/{block.target}
          </span>
        </span>
        <span className="block truncate text-xs text-text-muted">
          {block.detail}
        </span>
        <span className="mt-2 block h-1 w-full overflow-hidden rounded-full bg-surface-2">
          <span
            className="block h-full rounded-full bg-text transition-all"
            style={{ width: `${pct}%` }}
          />
        </span>
      </span>

      <span className="flex shrink-0 flex-col items-end gap-1">
        <span className="font-mono text-[11px] text-text-muted">
          ~{block.estMin}′
        </span>
        <ChevronRight className="h-4 w-4 text-text-muted" />
      </span>
    </button>
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
        <button
          type="button"
          aria-label="Apri menu"
          className="-ml-1 rounded-md p-1.5 text-text-muted"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="font-display text-lg font-semibold tracking-tight">
          Shakh
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Notifiche"
            className="rounded-md p-1.5 text-text-muted"
          >
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
