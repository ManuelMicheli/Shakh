import Link from "next/link";
import { Target, Crosshair, Wrench, ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { NextStep } from "@/components/percorso/NextStep";
import { GlyphWatermark } from "@/components/layout/GlyphWatermark";
import type { NextStep as NextStepData } from "@/lib/path/recommend";
import type { OverallRating } from "@/lib/rating/aggregate";

/**
 * Testata della Dashboard pensata per il telefono (mobile-only): impaginazione
 * editoriale senza bordi — saluto, Rating Shakh con il glifo del cavallo come
 * watermark, scomposizione per dominio — poi un divisore damier e la zona
 * operativa in card (prossimo passo + allenamenti rapidi).
 *
 * Mostrata solo sotto `md`; su desktop resta la `DashboardView` completa.
 * I numeri di sintesi che qui compaiono (rating, prossimo passo) vengono
 * nascosti nella DashboardView sotto `md` per non duplicarli.
 */

// Voci di azione rapida: solo chiavi i18n + href + icona; i testi vivono nei messaggi.
const QUICK: { labelKey: string; detailKey: string; href: string; icon: LucideIcon }[] =
  [
    { labelKey: "quick.tactics.label", detailKey: "quick.tactics.detail", href: "/app/tattiche", icon: Target },
    {
      labelKey: "quick.weaknesses.label",
      detailKey: "quick.weaknesses.detail",
      href: "/app/debolezze",
      icon: Crosshair,
    },
    {
      labelKey: "quick.fixMistakes.label",
      detailKey: "quick.fixMistakes.detail",
      href: "/app/ripara",
      icon: Wrench,
    },
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

export async function MobileDashboardHero({
  name,
  rating,
  step,
}: {
  name: string;
  rating: OverallRating | null;
  step: NextStepData | null;
}) {
  const t = await getTranslations("dashboard");
  const locale = await getLocale();

  return (
    <div className="space-y-5 md:hidden">
      {/* Testata: pezzo cavallo grande come watermark dietro al testo. */}
      <div className="relative">
        <GlyphWatermark glyph="♞" />
        <div className="relative">
          <p className="text-xs uppercase tracking-wider text-text-muted first-letter:uppercase">
            {todayLabel(locale)}
          </p>
          <h1 className="mt-0.5 font-display text-[1.7rem] font-semibold leading-tight tracking-tight">
            {t("greeting", { name })}
          </h1>
          {rating?.rating != null ? (
            <>
              <div className="mt-6 flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider text-text-muted">
                  {t("shakhRating.title")}
                </span>
                <span className="text-[10px] uppercase tracking-wide text-text-muted/70">
                  · OTB
                </span>
                {rating.provisional && (
                  <span className="text-[10px] uppercase tracking-wide text-text-muted/70">
                    · {t("shakhRating.notCalibrated")}
                  </span>
                )}
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-mono text-5xl font-semibold tabular-nums tracking-tight">
                  {rating.rating}
                </span>
                <span className="font-mono text-sm text-text-muted">
                  ± {rating.rd}
                </span>
              </div>
            </>
          ) : (
            <p className="mt-4 text-sm text-text-muted">
              {t("subtitle")}
            </p>
          )}
        </div>
      </div>

      {/* Divisore damier: testata → zona operativa. */}
      <div className="chess-rule h-1 w-full opacity-70" />

      {/* Zona operativa in card. */}
      <section className="space-y-3">
        <NextStep step={step} />

        <div className="space-y-2">
          <p className="px-0.5 text-[0.7rem] font-medium uppercase tracking-wider text-text-muted/70">
            {t("trainNow")}
          </p>
          <div className="space-y-2">
            {QUICK.map((it) => {
              const Icon = it.icon;
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface p-3 text-left transition-colors hover:bg-surface-2"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-2 text-text">
                    <Icon className="h-[1.05rem] w-[1.05rem]" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{t(it.labelKey)}</span>
                    <span className="block truncate text-xs text-text-muted">
                      {t(it.detailKey)}
                    </span>
                  </span>
                  <ChevronRight
                    className="h-4 w-4 shrink-0 text-text-muted"
                    aria-hidden
                  />
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
