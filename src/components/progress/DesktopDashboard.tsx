import Link from "next/link";
import { Compass, Target, Crosshair, Wrench, ChevronRight, ArrowUpRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils";
import { GlyphWatermark } from "@/components/layout/GlyphWatermark";
import type { DashboardData } from "@/lib/progress/aggregate";
import type { OverallRating } from "@/lib/rating/aggregate";
import type { NextStep as NextStepData } from "@/lib/path/recommend";

/**
 * Dashboard desktop — redesign "Broadsheet" (variante A approvata, prompt 10
 * showcase). Impaginazione editoriale a tutta larghezza: masthead "Ciao, {nome}.",
 * regola damier, una card-hero del Rating Shakh (numero mono grande, ± RD,
 * didascalia di trend, sparkline monocromatica) affiancata alle dimensioni del
 * rating come righe editoriali, poi il prossimo passo come feature card a fianco
 * delle tessere di allenamento.
 *
 * SOLO desktop (`hidden md:block`): su telefono resta la `MobileDashboardHero`.
 * Tutti i numeri vengono dai dati reali (`data`, `step`); niente dati inventati.
 */

const TILE_BASE =
  "group flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 text-left transition-colors hover:border-text";

// Tessere di allenamento rapido: stesse rotte/etichette i18n della hero mobile.
const TRAIN: { labelKey: string; detailKey: string; href: string; icon: LucideIcon }[] = [
  { labelKey: "quick.tactics.label", detailKey: "quick.tactics.detail", href: "/app/tattiche", icon: Target },
  { labelKey: "quick.weaknesses.label", detailKey: "quick.weaknesses.detail", href: "/app/debolezze", icon: Crosshair },
  { labelKey: "quick.fixMistakes.label", detailKey: "quick.fixMistakes.detail", href: "/app/ripara", icon: Wrench },
];

function todayLabel(locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale === "it" ? "it-IT" : "en-US", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(new Date());
  } catch {
    return "";
  }
}

export interface DesktopDashboardProps {
  name: string;
  data: DashboardData;
  step: NextStepData | null;
}

/** Sezione desktop completa della dashboard (Broadsheet). */
export async function DesktopDashboard({ name, data, step }: DesktopDashboardProps) {
  const t = await getTranslations("dashboard");
  const tStudy = await getTranslations("study");
  const locale = await getLocale();

  return (
    <div className="hidden md:block">
      <div className="space-y-8">
        {/* Masthead editoriale: data + saluto. Nessun glifo qui (solo nella card). */}
        <div className="relative">
          <p className="font-mono text-[11px] uppercase tracking-widest text-text-muted first-letter:uppercase">
            {todayLabel(locale)} · {t("subtitle")}
          </p>
          <h1 className="mt-2 font-display text-5xl font-semibold leading-[1.02] tracking-tight">
            {t("greeting", { name })}.
          </h1>
        </div>

        <div className="chess-rule h-1.5 w-full opacity-80" />

        {/* Rating hero + dimensioni del rating come righe editoriali. */}
        <div className="grid grid-cols-[20rem_1fr] gap-8">
          <RatingCard rating={data.shakhRating} trend={data.trends.rating} t={t} />
          <DimensionRows data={data} t={t} />
        </div>

        {/* Prossimo passo (feature) + allenamenti (tessere). */}
        <div className="grid grid-cols-[1fr_22rem] gap-8">
          <FeatureNextStep step={step} tStudy={tStudy} />
          <div>
            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-text-muted">
              {t("trainNow")}
            </p>
            <div className="grid grid-cols-2 gap-3">
              {TRAIN.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href} className={TILE_BASE}>
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-surface-2">
                      <Icon className="h-[1.05rem] w-[1.05rem]" aria-hidden />
                    </span>
                    <span>
                      <span className="block text-sm font-medium">{t(item.labelKey)}</span>
                      <span className="block text-xs text-text-muted">{t(item.detailKey)}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type T = Awaited<ReturnType<typeof getTranslations<"dashboard">>>;
type TStudy = Awaited<ReturnType<typeof getTranslations<"study">>>;

/**
 * Card del Rating Shakh: glifo cavallo in filigrana, numero grande mono, ± RD,
 * didascalia di trend (delta dello storico tattico, se presente) e sparkline
 * dalla serie reale (`data.trends.rating`). Se non c'è rating mostra un placeholder.
 */
function RatingCard({
  rating,
  trend,
  t,
}: {
  rating: OverallRating | null;
  trend: { label: string; value: number }[];
  t: T;
}) {
  const series = trend.map((p) => p.value);
  // Delta del trend: differenza fra ultimo e primo punto della serie reale.
  const trendDelta =
    series.length >= 2 ? series[series.length - 1] - series[0] : null;

  return (
    <div className="chess-corners relative flex flex-col overflow-hidden rounded-2xl border border-border bg-surface p-7">
      <GlyphWatermark glyph="♞" />

      <div className="relative flex items-center justify-between">
        <span className="text-xs uppercase tracking-[0.2em] text-text-muted">
          {t("shakhRating.title")}
        </span>
        <span className="rounded-full border border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-text-muted">
          OTB
        </span>
      </div>

      <div className="relative mt-5 flex items-baseline gap-3">
        <span className="font-mono text-[5.5rem] font-semibold leading-none tabular-nums tracking-tighter">
          {rating?.rating != null ? rating.rating : "—"}
        </span>
        {rating?.rating != null && (
          <span className="mb-1 rounded-md bg-surface-2 px-2 py-1 font-mono text-xs text-text-muted">
            ± {rating.rd}
          </span>
        )}
      </div>

      {/* Didascalia di trend: dal delta reale dello storico, o stato di calibrazione. */}
      {trendDelta != null && trendDelta !== 0 ? (
        <div className="relative mt-4 flex items-center gap-2 font-mono text-xs">
          <span className="inline-flex items-center gap-1 text-text">
            <ArrowUpRight
              className={cn("h-3.5 w-3.5", trendDelta < 0 && "rotate-90")}
              aria-hidden
            />
            {trendDelta > 0 ? "+" : ""}
            {trendDelta}
          </span>
          <span className="text-text-muted">{t("trendRating.title")}</span>
        </div>
      ) : rating?.provisional ? (
        <p className="relative mt-4 font-mono text-xs text-text-muted">
          {t("shakhRating.notCalibrated")}
        </p>
      ) : null}

      {series.length >= 2 && (
        <div className="relative mt-6">
          <Sparkline points={series} />
        </div>
      )}
    </div>
  );
}

/** Sparkline monocromatica dalla serie reale del rating tattico. Decorativa. */
function Sparkline({ points }: { points: number[] }) {
  const w = 240;
  const h = 56;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const step = w / (points.length - 1);
  const xy = points.map((v, i) => [i * step, h - ((v - min) / span) * (h - 6) - 3]);
  const line = xy.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `0,${h} ${line} ${w},${h}`;
  const [lx, ly] = xy[xy.length - 1];

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="h-14 w-full text-text"
      preserveAspectRatio="none"
      aria-hidden
    >
      <polygon points={area} fill="currentColor" opacity={0.06} />
      <polyline
        points={line}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={lx} cy={ly} r={3} fill="currentColor" />
    </svg>
  );
}

/**
 * Dimensioni del rating come righe editoriali (colonna destra). Usa la
 * scomposizione per dominio del Rating Shakh se disponibile (valore + nº campioni),
 * altrimenti ripiega sulle competenze per area (percentuale) — entrambe reali.
 */
function DimensionRows({ data, t }: { data: DashboardData; t: T }) {
  const breakdown = data.shakhRating?.breakdown.filter((b) => b.rating != null) ?? [];

  if (breakdown.length > 0) {
    return (
      <div className="grid border-t border-border xl:grid-cols-2 xl:gap-x-12">
        {breakdown.map((b) => (
          <div key={b.domain} className="flex items-baseline justify-between gap-4 border-b border-border py-4">
            <div className="min-w-0">
              <p className="text-sm">{b.label}</p>
              <p className="mt-0.5 font-mono text-[11px] text-text-muted">
                {t("weaknesses.attempts", { count: b.samples })}
                {b.provisional ? ` · ${t("shakhRating.notCalibrated")}` : ""}
              </p>
            </div>
            <p className="flex shrink-0 items-baseline gap-2 text-right">
              <span className="font-display text-3xl font-semibold tabular-nums">
                {b.rating}
              </span>
              <span className="w-8 font-mono text-xs text-text-muted">± {b.rd}</span>
            </p>
          </div>
        ))}
      </div>
    );
  }

  // Fallback: competenze per area come percentuale (solo aree con dati).
  const areas = data.competence.filter((c) => c.score != null);
  return (
    <div className="grid border-t border-border xl:grid-cols-2 xl:gap-x-12">
      {areas.map((c) => (
        <div key={c.area} className="flex items-baseline justify-between gap-4 border-b border-border py-4">
          <div className="min-w-0">
            <p className="text-sm">{c.label}</p>
            <p className="mt-0.5 font-mono text-[11px] text-text-muted">
              {t("weaknesses.attempts", { count: c.attempts })}
            </p>
          </div>
          <span className="shrink-0 font-display text-3xl font-semibold tabular-nums">
            {Math.round((c.score ?? 0) * 100)}%
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * Prossimo passo come feature card larga: glifo pedone, kicker, titolo, motivo
 * (tutti reali da `step`) e CTA che porta all'attività raccomandata. Se non c'è
 * un passo, invita a completare il diagnostico.
 */
function FeatureNextStep({
  step,
  tStudy,
}: {
  step: NextStepData | null;
  tStudy: TStudy;
}) {
  return (
    <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-surface p-7">
      <GlyphWatermark glyph="♟" />
      <div className="relative">
        <span className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-text-muted">
          <Compass className="h-3.5 w-3.5" aria-hidden /> {tStudy("nextStep.title")}
        </span>
        <h3 className="mt-3 font-display text-3xl font-semibold tracking-tight">
          {step ? step.title : tStudy("nextStep.title")}
        </h3>
        <p className="mt-2 max-w-md text-sm text-text-muted">
          {step ? step.reason : tStudy("nextStep.completeDiagnostic")}
        </p>
      </div>
      {step?.activity ? (
        <Link
          href={step.activity.href}
          className="relative mt-6 inline-flex h-11 w-fit items-center gap-1.5 rounded-lg bg-text px-6 text-sm font-medium text-bg hover:opacity-90"
        >
          {step.activity.label}
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Link>
      ) : (
        <Link
          href="/app/onboarding"
          className="relative mt-6 inline-flex h-11 w-fit items-center gap-1.5 rounded-lg bg-text px-6 text-sm font-medium text-bg hover:opacity-90"
        >
          {tStudy("nextStep.startDiagnostic")}
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Link>
      )}
    </div>
  );
}
