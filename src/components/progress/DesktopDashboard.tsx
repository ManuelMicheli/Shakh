import Link from "next/link";
import { Compass, Target, Crosshair, Wrench, ChevronRight } from "lucide-react";
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
  "group flex items-center rounded-xl border border-border bg-surface px-4 py-3 text-left transition-colors hover:border-text";

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
        {/* Masthead editoriale: data + saluto a sinistra, azioni rapide a destra. */}
        <div className="relative flex items-end justify-between gap-8">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-widest text-text-muted first-letter:uppercase">
              {todayLabel(locale)} · {t("subtitle")}
            </p>
            <h1 className="mt-2 font-display text-5xl font-semibold leading-[1.02] tracking-tight">
              {t("greeting", { name })}.
            </h1>
          </div>
          <div className="shrink-0">
            <p className="mb-2 text-right text-xs font-medium uppercase tracking-wider text-text-muted">
              {t("trainNow")}
            </p>
            <div className="flex gap-3">
              {TRAIN.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href} className={TILE_BASE}>
                    <span className="flex items-center gap-2.5">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface-2">
                        <Icon className="h-4 w-4" aria-hidden />
                      </span>
                      <span>
                        <span className="block text-sm font-medium leading-tight">{t(item.labelKey)}</span>
                        <span className="block text-xs text-text-muted">{t(item.detailKey)}</span>
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        <div className="chess-rule h-1.5 w-full opacity-80" />

        {/* Rating hero: solo l'Elo principale. Le singole competenze vivono nella
            mappa competenze più in basso, non più scomposte qui. */}
        <RatingCard rating={data.shakhRating} trend={data.trends.rating} t={t} />

        {/* Prossimo passo: feature card a tutta larghezza. */}
        <FeatureNextStep step={step} tStudy={tStudy} />
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
    <div className="chess-corners relative flex items-center gap-8 overflow-hidden rounded-2xl border border-border bg-surface px-9 py-8">
      <GlyphWatermark glyph="♞" />

      {/* Colonna sinistra: etichetta, numero grande, ± RD, trend. */}
      <div className="relative min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-[0.2em] text-text-muted">
            {t("shakhRating.title")}
          </span>
          <span className="rounded-full border border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-text-muted">
            OTB
          </span>
          {rating?.provisional && (
            <span className="rounded-full bg-surface-2 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-text-muted">
              {t("shakhRating.notCalibrated")}
            </span>
          )}
        </div>

        <div className="mt-3 flex items-baseline gap-3">
          <span className="font-mono text-[5.5rem] font-semibold leading-none tabular-nums tracking-tighter">
            {rating?.rating != null ? rating.rating : "—"}
          </span>
          {rating?.rating != null && (
            <span className="mb-1 rounded-md bg-surface-2 px-2 py-1 font-mono text-xs text-text-muted">
              ± {rating.rd}
            </span>
          )}
        </div>

        {/* Didascalia di trend: chevron a 45° (la Diagonale, DESIGN.md),
            positivo in accento, negativo attenuato. */}
        {trendDelta != null && trendDelta !== 0 && (
          <div className="mt-3 flex items-center gap-2 font-mono text-xs">
            <span
              className={cn(
                "inline-flex items-center gap-1 tabular-nums",
                trendDelta > 0 ? "text-accent" : "text-text-muted",
              )}
            >
              <span aria-hidden>{trendDelta > 0 ? "◢" : "◥"}</span>
              {trendDelta > 0 ? "+" : ""}
              {trendDelta}
            </span>
            <span className="text-text-muted">{t("trendRating.title")}</span>
          </div>
        )}
      </div>
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
