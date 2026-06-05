import Link from "next/link";
import {
  RotateCcw,
  Crosshair,
  Target,
  Flag,
  Library,
  ChevronRight,
  Check,
  Play,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { createClient, getUser } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { buildDailyPlan, type PlanBlock, type BlockKind } from "@/lib/daily/plan";
import { activeLocale } from "@/lib/i18n/content";
import { cn } from "@/lib/utils";
import { getTranslations } from "next-intl/server";

export async function generateMetadata() {
  const t = await getTranslations("metadata");
  return { title: t("today") };
}

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
    return new Intl.DateTimeFormat("en-US", {
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

  const plan = await buildDailyPlan(supabase, user!.id, await activeLocale());
  const doneCount = plan.blocks.filter((b) => b.done >= b.target).length;
  const startBlock = plan.blocks.find((b) => b.done < b.target) ?? plan.blocks[0];
  const startHref = startBlock?.href ?? "#";

  return (
    <div className="space-y-8">
      {/* ===== MOBILE: testata editoriale + glifo pedone + blocchi in card ===== */}
      <div className="space-y-5 md:hidden">
        <div className="relative">
          <div className="relative">
            <p className="text-xs uppercase tracking-wider text-text-muted">
              {todayLabel()}
            </p>
            <h1 className="mt-0.5 font-display text-2xl font-semibold tracking-tight">
              Today
            </h1>
            <div className="mt-6 flex items-end gap-2">
              <span className="font-mono text-5xl font-semibold tabular-nums tracking-tight">
                ~{plan.totalMin}
                <span className="text-3xl">′</span>
              </span>
            </div>
            <p className="mt-1 text-xs uppercase tracking-wide text-text-muted">
              estimated time · {doneCount}/{plan.blocks.length} completed
            </p>
          </div>
        </div>

        <div className="chess-rule h-1 w-full opacity-70" />

        {plan.completed && (
          <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
            <Badge>done</Badge>
            <p className="text-sm">
              Today&apos;s session complete. Come back tomorrow for your next plan.
            </p>
          </div>
        )}

        <section className="space-y-2">
          <p className="px-0.5 text-[0.7rem] font-medium uppercase tracking-wider text-text-muted/70">
            The plan
          </p>
          <div className="space-y-2">
            {plan.blocks.map((b) => (
              <BlockCard key={b.kind} block={b} />
            ))}
          </div>
        </section>
      </div>

      {/* ===== DESKTOP: layout Session (pannello sessione + piano) ===== */}
      <div className="hidden md:block">
        <div className="grid grid-cols-[20rem_1fr] gap-8">
          {/* Pannello sessione */}
          <div className="space-y-6">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-widest text-text-muted">
                {todayLabel()}
              </p>
              <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
                Today
              </h1>
            </div>

            <div className="chess-corners relative flex flex-col items-center gap-5 overflow-hidden rounded-2xl border border-border bg-surface p-7">
              <TodayProgressRing done={doneCount} total={plan.blocks.length} />
              <div className="text-center">
                <p className="font-mono text-4xl font-semibold tabular-nums">
                  ~{plan.totalMin}
                  <span className="text-2xl">′</span>
                </p>
                <p className="mt-1 text-xs uppercase tracking-wide text-text-muted">
                  estimated time
                </p>
              </div>
              <Link
                href={startHref}
                className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-lg bg-text text-sm font-medium text-bg transition-opacity hover:opacity-90"
              >
                <Play className="h-4 w-4" aria-hidden />
                Start session
              </Link>
            </div>

            {plan.completed && (
              <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
                <Badge>done</Badge>
                <p className="text-sm">
                  Today&apos;s session complete. Come back tomorrow for your next plan.
                </p>
              </div>
            )}
          </div>

          {/* Blocchi: a piena larghezza si dispongono su due colonne. */}
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
              The plan
            </p>
            <div className="grid gap-3 xl:grid-cols-2">
              {plan.blocks.map((b) => (
                <BlockRowDesktop key={b.kind} block={b} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Anello di progresso circolare: blocchi completati vs totali. */
function TodayProgressRing({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? done / total : 0;
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid h-32 w-32 place-items-center">
      <svg viewBox="0 0 120 120" className="h-32 w-32 -rotate-90 text-text" aria-hidden>
        <circle cx="60" cy="60" r={r} fill="none" stroke="currentColor" strokeWidth="6" opacity={0.12} />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
        />
      </svg>
      <div className="absolute text-center">
        <p className="font-mono text-2xl font-semibold tabular-nums">
          {done}/{total}
        </p>
        <p className="text-[10px] uppercase tracking-wide text-text-muted">blocks</p>
      </div>
    </div>
  );
}

/** Riga blocco desktop (variante Session): icona, progresso, barra, chevron. */
function BlockRowDesktop({ block }: { block: PlanBlock }) {
  const done = block.done >= block.target;
  const pct =
    block.target > 0
      ? Math.min(100, Math.round((block.done / block.target) * 100))
      : 0;
  const Icon = BLOCK_ICON[block.kind];
  return (
    <Link
      href={block.href}
      className={cn(
        "group flex w-full items-center gap-4 rounded-xl border border-border bg-surface p-4 text-left transition-colors hover:border-text",
        done && "opacity-60",
      )}
    >
      <span
        className={cn(
          "grid h-10 w-10 shrink-0 place-items-center rounded-lg",
          done ? "bg-text text-bg" : "bg-surface-2 text-text",
        )}
      >
        {done ? <Check className="h-5 w-5" aria-hidden /> : <Icon className="h-5 w-5" aria-hidden />}
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
        <span className="font-mono text-[11px] text-text-muted">~{block.estMin}′</span>
        <ChevronRight className="h-4 w-4 text-text-muted" aria-hidden />
      </span>
    </Link>
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
