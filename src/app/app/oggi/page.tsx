import Link from "next/link";
import {
  RotateCcw,
  Crosshair,
  Target,
  Flag,
  Library,
  ChevronRight,
  Check,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { createClient, getUser } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buildDailyPlan, type PlanBlock, type BlockKind } from "@/lib/daily/plan";
import { cn } from "@/lib/utils";

export const metadata = { title: "Allenamento di oggi — Shakh" };

/** Icona per tipo di blocco (testata card su mobile). */
const BLOCK_ICON: Record<BlockKind, LucideIcon> = {
  review: RotateCcw,
  weakness: Crosshair,
  tactics: Target,
  endgame: Flag,
  repertoire: Library,
};

function todayLabel(): string {
  try {
    return new Intl.DateTimeFormat("it-IT", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(new Date());
  } catch {
    return "";
  }
}

export default async function OggiPage() {
  const supabase = await createClient();
  const user = await getUser();

  const plan = await buildDailyPlan(supabase, user!.id);
  const doneCount = plan.blocks.filter((b) => b.done >= b.target).length;

  return (
    <div className="space-y-8">
      {/* ===== MOBILE: testata editoriale + glifo pedone + blocchi in card ===== */}
      <div className="space-y-5 md:hidden">
        <div>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wider text-text-muted">
                {todayLabel()}
              </p>
              <h1 className="mt-0.5 font-display text-[1.7rem] font-semibold leading-tight tracking-tight">
                Oggi
              </h1>
            </div>
            <span
              aria-hidden
              className="-mt-4 shrink-0 select-none font-display text-[9rem] leading-none text-text opacity-20"
            >
              ♟
            </span>
          </div>
          <div className="mt-5 flex items-end gap-2">
            <span className="font-mono text-5xl font-semibold tabular-nums tracking-tight">
              ~{plan.totalMin}
              <span className="text-3xl">′</span>
            </span>
          </div>
          <p className="mt-1 text-xs uppercase tracking-wide text-text-muted">
            durata stimata · {doneCount}/{plan.blocks.length} completati
          </p>
        </div>

        <div className="chess-rule h-1 w-full opacity-70" />

        {plan.completed && (
          <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
            <Badge>fatto</Badge>
            <p className="text-sm">
              Sessione di oggi completata. Torna domani per il prossimo piano.
            </p>
          </div>
        )}

        <section className="space-y-2">
          <p className="px-0.5 text-[0.7rem] font-medium uppercase tracking-wider text-text-muted/70">
            Il piano
          </p>
          <div className="space-y-2">
            {plan.blocks.map((b) => (
              <BlockCard key={b.kind} block={b} />
            ))}
          </div>
        </section>
      </div>

      {/* ===== DESKTOP: layout esistente ===== */}
      <div className="hidden md:block">
        <div className="space-y-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="font-display text-3xl font-semibold tracking-tight">
                Allenamento di oggi
              </h1>
              <p className="mt-2 max-w-2xl text-text-muted">
                Una sessione breve e mirata, costruita dai tuoi dati: ripasso, punti deboli,
                tattica e finali. Siediti e allenati.
              </p>
            </div>
            <div className="text-right">
              <div className="font-mono text-2xl tabular-nums">~{plan.totalMin}′</div>
              <div className="text-xs uppercase tracking-wide text-text-muted">durata stimata</div>
            </div>
          </div>

          {plan.completed && (
            <Card>
              <CardContent className="flex items-center gap-3 py-4">
                <Badge>fatto</Badge>
                <p className="text-sm">
                  Sessione di oggi completata. Ottimo lavoro — torna domani per il prossimo piano.
                </p>
              </CardContent>
            </Card>
          )}

          <ol className="mt-8 space-y-3">
            {plan.blocks.map((b, i) => (
              <BlockRow key={b.kind} block={b} index={i + 1} />
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

/** Card di blocco per mobile: icona per tipo, progresso, tempo stimato. */
function BlockCard({ block }: { block: PlanBlock }) {
  const done = block.done >= block.target;
  const pct = block.target > 0 ? Math.min(100, Math.round((block.done / block.target) * 100)) : 0;
  const Icon = BLOCK_ICON[block.kind];

  return (
    <Link
      href={block.href}
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
          <Check className="h-[1.05rem] w-[1.05rem]" aria-hidden />
        ) : (
          <Icon className="h-[1.05rem] w-[1.05rem]" aria-hidden />
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium">{block.title}</span>
          <span className="shrink-0 font-mono text-[11px] text-text-muted">
            {block.done}/{block.target}
          </span>
        </span>
        <span className="block truncate text-xs text-text-muted">{block.detail}</span>
        <span className="mt-2 block h-1 w-full overflow-hidden rounded-full bg-surface-2">
          <span
            className="block h-full rounded-full bg-text transition-all"
            style={{ width: `${pct}%` }}
          />
        </span>
      </span>

      <span className="flex shrink-0 flex-col items-end gap-1">
        <span className="font-mono text-[11px] text-text-muted">~{block.estMin}′</span>
        <ChevronRight className="h-4 w-4 text-text-muted" aria-hidden />
      </span>
    </Link>
  );
}

function BlockRow({ block, index }: { block: PlanBlock; index: number }) {
  const done = block.done >= block.target;
  const pct = block.target > 0 ? Math.min(100, Math.round((block.done / block.target) * 100)) : 0;

  return (
    <li>
      <Link href={block.href} className="group block">
        <Card className={cn("transition-colors group-hover:border-text", done && "opacity-70")}>
          <CardContent className="flex items-center gap-4 py-4">
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border font-mono text-sm",
                done ? "border-text bg-text text-bg" : "border-border text-text-muted",
              )}
            >
              {done ? "✓" : index}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate font-medium">{block.title}</p>
                <span className="shrink-0 font-mono text-xs text-text-muted">
                  {block.done}/{block.target}
                </span>
              </div>
              <p className="mt-0.5 truncate text-sm text-text-muted">{block.detail}</p>
              <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-surface-2">
                <div className="h-full rounded-full bg-text transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>

            <span className="shrink-0 font-mono text-xs text-text-muted">~{block.estMin}′</span>
          </CardContent>
        </Card>
      </Link>
    </li>
  );
}
