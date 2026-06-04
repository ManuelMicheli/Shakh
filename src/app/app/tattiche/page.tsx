import Link from "next/link";
import {
  Infinity as InfinityIcon,
  Target,
  RotateCcw,
  Timer,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { createClient, getUser } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TacticsTrainer } from "@/components/tactics/TacticsTrainer";
import { ensureStats, selectNextPuzzle, dueReviewCount } from "@/lib/tactics/query";
import { TACTIC_THEMES, themeLabel } from "@/lib/tactics/themes";
import type { TacticMode, TacticStats } from "@/lib/tactics/types";

export const metadata = { title: "Tactics — Shakh" };

const MODES: { mode: TacticMode; title: string; desc: string; icon: LucideIcon }[] = [
  { mode: "adaptive", title: "Adaptive", desc: "A continuous flow of puzzles at your level. Updates rating and streak.", icon: InfinityIcon },
  { mode: "theme", title: "By theme", desc: "Train a specific motif: fork, pin, endgames…", icon: Target },
  { mode: "review", title: "Review", desc: "Revisit due missed puzzles (spaced repetition).", icon: RotateCcw },
  { mode: "timed", title: "Timed challenge", desc: "3 minutes, rising difficulty: how many can you solve?", icon: Timer },
];

const VALID_MODES: TacticMode[] = ["adaptive", "theme", "review", "timed"];

export default async function TattichePage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; theme?: string }>;
}) {
  const sp = await searchParams;
  const mode = VALID_MODES.includes(sp.mode as TacticMode) ? (sp.mode as TacticMode) : null;
  const theme = typeof sp.theme === "string" && sp.theme ? sp.theme : null;

  const supabase = await createClient();
  const user = await getUser();

  const stats = await ensureStats(supabase, user!.id);

  // Modalità attiva → trainer (per "Per tema" serve un tema scelto).
  if (mode && (mode !== "theme" || theme)) {
    const puzzle = await selectNextPuzzle(supabase, user!.id, {
      mode,
      theme,
      targetRating: mode === "timed" ? stats.rating : undefined,
    });
    return (
      <TacticsTrainer mode={mode} theme={theme} initialPuzzle={puzzle} initialStats={stats} />
    );
  }

  // "Per tema" senza tema → scelta del tema.
  if (mode === "theme") {
    return <ThemePicker />;
  }

  const reviewCount = await dueReviewCount(supabase, user!.id);
  return <Hub stats={stats} reviewCount={reviewCount} />;
}

function Hub({ stats, reviewCount }: { stats: TacticStats; reviewCount: number }) {
  return (
    <div className="space-y-8">
      {/* ===== MOBILE: testata editoriale + rating hero + modalità a list-card ===== */}
      <div className="space-y-5 md:hidden">
        <div className="relative">
          <div className="relative">
            <p className="text-xs uppercase tracking-wider text-text-muted">
              Tactical vision
            </p>
            <h1 className="mt-0.5 font-display text-[1.7rem] font-semibold leading-tight tracking-tight">
              Tactics
            </h1>

            <p className="mt-6 text-xs uppercase tracking-wider text-text-muted">
              Tactical rating
            </p>
            <div className="mt-1 font-mono text-5xl font-semibold tabular-nums tracking-tight">
              {stats.rating}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-x-3">
              <Mini label="Streak" value={stats.currentStreak} />
              <Mini label="Best" value={stats.bestStreak} />
              <Mini label="Solved" value={stats.puzzlesSolved} />
            </div>
          </div>
        </div>

        <div className="chess-rule h-1 w-full opacity-70" />

        <section className="space-y-2">
          <p className="px-0.5 text-[0.7rem] font-medium uppercase tracking-wider text-text-muted/70">
            Train
          </p>
          <div className="space-y-2">
            {MODES.map((m) => {
              const Icon = m.icon;
              return (
                <Link
                  key={m.mode}
                  href={`/app/tattiche?mode=${m.mode}`}
                  className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface p-3 transition-colors hover:bg-surface-2"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-surface-2 text-text">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-medium">{m.title}</span>
                      {m.mode === "review" && reviewCount > 0 && (
                        <span className="shrink-0 rounded-full bg-text px-2 py-0.5 text-[10px] font-medium text-bg">
                          {reviewCount} due
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-text-muted">
                      {m.desc}
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-text-muted" aria-hidden />
                </Link>
              );
            })}
          </div>
        </section>
      </div>

      {/* ===== DESKTOP: layout esistente ===== */}
      <div className="hidden space-y-8 md:block">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Tactics</h1>
          <p className="mt-2 text-text-muted">
            Train your tactical vision with puzzles. The rating adapts to you and missed
            puzzles come back for review.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Tactical rating" value={stats.rating} />
          <Stat label="Current streak" value={stats.currentStreak} />
          <Stat label="Best streak" value={stats.bestStreak} />
          <Stat label="Solved" value={stats.puzzlesSolved} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {MODES.map((m) => (
            <Link key={m.mode} href={`/app/tattiche?mode=${m.mode}`} className="group">
              <Card className="h-full transition-colors group-hover:border-text">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{m.title}</CardTitle>
                    {m.mode === "review" && reviewCount > 0 && (
                      <Badge>{reviewCount} due</Badge>
                    )}
                  </div>
                  <CardDescription>{m.desc}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="font-mono text-lg font-semibold tabular-nums">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-text-muted">{label}</p>
    </div>
  );
}

function ThemePicker() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          By theme — pick a motif
        </h1>
        <Link href="/app/tattiche" className="text-sm text-text-muted hover:text-text">
          ← Tactics
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {TACTIC_THEMES.map((t) => (
          <Link key={t.key} href={`/app/tattiche?mode=theme&theme=${t.key}`}>
            <Card className="transition-colors hover:border-text">
              <CardContent className="py-4 text-center font-medium">{themeLabel(t.key)}</CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="text-xs uppercase tracking-wide text-text-muted">{label}</div>
      <div className="mt-1 font-mono text-2xl">{value}</div>
    </div>
  );
}
