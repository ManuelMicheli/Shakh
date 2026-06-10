import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import {
  Infinity as InfinityIcon,
  Target,
  RotateCcw,
  Timer,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { createClient, getUser } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { TacticsTrainer } from "@/components/tactics/TacticsTrainer";
import { ensureStats, selectNextPuzzle, dueReviewCount } from "@/lib/tactics/query";
import { THEME_GROUPS, themesOfGroup, themeLabel, groupLabel } from "@/lib/tactics/themes";
import type { TacticMode, TacticStats } from "@/lib/tactics/types";

export async function generateMetadata() {
  const t = await getTranslations("tactics");
  return { title: t("metaTitle") };
}

const MODES: { mode: TacticMode; icon: LucideIcon }[] = [
  { mode: "adaptive", icon: InfinityIcon },
  { mode: "theme", icon: Target },
  { mode: "review", icon: RotateCcw },
  { mode: "timed", icon: Timer },
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

async function Hub({ stats, reviewCount }: { stats: TacticStats; reviewCount: number }) {
  const t = await getTranslations("tactics");
  const locale = (await getLocale()) as "it" | "en";
  return (
    <div className="space-y-8">
      {/* ===== MOBILE: testata editoriale + rating hero + modalità a list-card ===== */}
      <div className="space-y-5 md:hidden">
        <div className="relative">
          <div className="relative">
            <p className="text-xs uppercase tracking-wider text-text-muted">
              {t("tacticalVision")}
            </p>
            <h1 className="mt-0.5 font-display text-[1.7rem] font-semibold leading-tight tracking-tight">
              {t("title")}
            </h1>

            <p className="mt-6 text-xs uppercase tracking-wider text-text-muted">
              {t("tacticalRating")}
            </p>
            <div className="mt-1 font-mono text-5xl font-semibold tabular-nums tracking-tight">
              {stats.rating}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-x-3">
              <Mini label={t("streak")} value={stats.currentStreak} />
              <Mini label={t("best")} value={stats.bestStreak} />
              <Mini label={t("solved")} value={stats.puzzlesSolved} />
            </div>
          </div>
        </div>

        <div className="chess-rule h-1 w-full opacity-70" />

        <section className="space-y-2">
          <p className="px-0.5 text-[0.7rem] font-medium uppercase tracking-wider text-text-muted/70">
            {t("train")}
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
                      <span className="text-sm font-medium">{t(`modes.${m.mode}.title`)}</span>
                      {m.mode === "review" && reviewCount > 0 && (
                        <span className="shrink-0 rounded-full bg-text px-2 py-0.5 text-[10px] font-medium text-bg">
                          {t("due", { count: reviewCount })}
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-text-muted">
                      {t(`modes.${m.mode}.desc`)}
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-text-muted" aria-hidden />
                </Link>
              );
            })}
          </div>
        </section>
      </div>

      {/* ===== DESKTOP: variante B · Themes ===== */}
      <div className="hidden space-y-8 md:block">
        {/* Banda rating */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-widest text-text-muted">
              {t("tacticalVision")}
            </p>
            <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight">
              {t("title")}
            </h1>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-5xl font-semibold tabular-nums tracking-tight">
              {stats.rating}
            </span>
            <span className="flex gap-2">
              {[
                { label: t("streak"), value: stats.currentStreak },
                { label: t("best"), value: stats.bestStreak },
                { label: t("solved"), value: stats.puzzlesSolved },
              ].map((s) => (
                <span
                  key={s.label}
                  className="rounded-full border border-border px-3 py-1 font-mono text-xs tabular-nums"
                >
                  <span className="text-text-muted">{s.label} </span>
                  {s.value}
                </span>
              ))}
            </span>
          </div>
        </div>

        {/* Modalità in riga */}
        <div className="grid grid-cols-4 gap-3">
          {MODES.map((m) => {
            const Icon = m.icon;
            return (
              <Link
                key={m.mode}
                href={`/app/tattiche?mode=${m.mode}`}
                className="group flex items-center gap-3 rounded-xl border border-border bg-surface p-4 text-left transition-colors hover:border-text"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-2">
                  <Icon className="h-[1.05rem] w-[1.05rem]" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    {t(`modes.${m.mode}.title`)}
                    {m.mode === "review" && reviewCount > 0 && (
                      <span className="shrink-0 rounded-full bg-text px-1.5 py-0.5 text-[9px] font-medium text-bg">
                        {t("due", { count: reviewCount })}
                      </span>
                    )}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>

        <div className="chess-rule h-1 w-full opacity-70" />

        {/* Temi in griglia */}
        <div>
          <div className="mb-4 flex items-baseline justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
              {t("trainTheme")}
            </p>
          </div>
          <div className="space-y-6">
            {THEME_GROUPS.map((g) => (
              <div key={g.key}>
                <p className="mb-2 font-mono text-[11px] uppercase tracking-widest text-text-muted">
                  {groupLabel(g.key, locale)}
                </p>
                <div className="grid grid-cols-4 gap-3">
                  {themesOfGroup(g.key).map((theme) => (
                    <Link
                      key={theme.key}
                      href={`/app/tattiche?mode=theme&theme=${theme.key}`}
                      className="group rounded-xl border border-border bg-surface p-4 text-left transition-colors hover:border-text"
                    >
                      <span className="font-medium">{themeLabel(theme.key, locale)}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
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

async function ThemePicker() {
  const t = await getTranslations("tactics");
  const locale = (await getLocale()) as "it" | "en";
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          {t("themePickerTitle")}
        </h1>
        <Link href="/app/tattiche" className="text-sm text-text-muted hover:text-text">
          {t("backToTacticsArrow")}
        </Link>
      </div>
      {THEME_GROUPS.map((g) => (
        <div key={g.key} className="space-y-2">
          <p className="font-mono text-[11px] uppercase tracking-widest text-text-muted">
            {groupLabel(g.key, locale)}
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {themesOfGroup(g.key).map((theme) => (
              <Link key={theme.key} href={`/app/tattiche?mode=theme&theme=${theme.key}`}>
                <Card className="transition-colors hover:border-text">
                  <CardContent className="py-4 text-center font-medium">
                    {themeLabel(theme.key, locale)}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
