import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ChevronRight, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { activeLocale, pickLocale } from "@/lib/i18n/content";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MobilePageHeader } from "@/components/layout/MobilePageHeader";
import type { TheoryType } from "@/lib/theory/types";

export const metadata = { title: "Theory — Shakh" };

interface LessonRow {
  slug: string;
  title: string;
  summary: string | null;
  type: TheoryType;
  eco_code: string | null;
  order_index: number;
}

// Riga grezza dal DB con le colonne bilingui (schema 0021).
interface LessonDbRow {
  slug: string;
  title_it: string | null;
  title_en: string | null;
  summary_it: string | null;
  summary_en: string | null;
  type: TheoryType;
  eco_code: string | null;
  order_index: number;
}

export default async function TeoriaPage() {
  const supabase = await createClient();
  const locale = await activeLocale();
  const t = await getTranslations("theory");

  const RAMI: {
    type: TheoryType;
    title: string;
    browseHref: string;
    browseLabel: string;
  }[] = [
    {
      type: "opening",
      title: t("branch.openings"),
      browseHref: "/app/teoria/aperture",
      browseLabel: t("home.browseEco"),
    },
    {
      type: "middlegame",
      title: t("branch.middlegame"),
      browseHref: "/app/teoria/mediogioco",
      browseLabel: t("home.browseThemes"),
    },
    {
      type: "endgame",
      title: t("branch.endgames"),
      browseHref: "/app/teoria/finali",
      browseLabel: t("home.browseEndgames"),
    },
  ];
  // Solo le lezioni pubblicate (RLS: lettura pubblica dei contenuti published).
  const { data } = await supabase
    .from("content_items")
    .select("slug, title_it, title_en, summary_it, summary_en, type, eco_code, order_index")
    .eq("published", true)
    .order("order_index", { ascending: true });

  // Risolve title/summary alla lingua attiva, mantenendo la stessa forma di output.
  const lessons: LessonRow[] = ((data as LessonDbRow[] | null) ?? []).map((r) => ({
    slug: r.slug,
    title: pickLocale(r.title_it, r.title_en, locale) ?? "",
    summary: pickLocale(r.summary_it, r.summary_en, locale),
    type: r.type,
    eco_code: r.eco_code,
    order_index: r.order_index,
  }));
  const byType = (t: TheoryType) => lessons.filter((l) => l.type === t);

  return (
    <div className="space-y-10">
      <MobilePageHeader
        eyebrow={t("home.eyebrow")}
        title={t("home.title")}
        desc={t("home.mobileDesc")}
      />

      {/* DESKTOP: testata classica. */}
      <div className="hidden md:block">
        <h1 className="font-display text-3xl font-semibold tracking-tight">{t("home.title")}</h1>
        <p className="mt-2 max-w-2xl text-text-muted">
          {t.rich("home.desc", { em: (chunks) => <em>{chunks}</em> })}
        </p>
      </div>

      {RAMI.map((ramo) => {
        const items = byType(ramo.type);
        return (
          <section key={ramo.type} className="space-y-4">
            {/* MOBILE: intestazione ramo evidenziata + regola damier. */}
            <div className="flex items-center gap-3 md:hidden">
              <h2 className="font-display text-xl font-semibold tracking-tight">
                {ramo.title}
              </h2>
              <div className="chess-rule h-1 flex-1 opacity-60" />
            </div>

            {/* DESKTOP: intestazione con link "sfoglia". */}
            <div className="hidden items-baseline justify-between gap-3 md:flex">
              <h2 className="font-display text-xl font-semibold tracking-tight">{ramo.title}</h2>
              <Link
                href={ramo.browseHref}
                className="text-sm text-text-muted hover:text-text"
              >
                {ramo.browseLabel} →
              </Link>
            </div>

            {items.length === 0 ? (
              <Card>
                <CardContent className="py-6 text-center text-sm text-text-muted">
                  {t("home.lessonsSoon")} <Badge className="ml-1">{t("home.soonBadge")}</Badge>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* MOBILE: lezioni a list-card + sfoglia tutto. */}
                <div className="space-y-2 md:hidden">
                  {items.map((l) => (
                    <Link
                      key={l.slug}
                      href={`/app/teoria/${l.slug}`}
                      className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface p-3 transition-colors hover:bg-surface-2"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium">{l.title}</span>
                          {l.eco_code && (
                            <span className="shrink-0 font-mono text-xs text-text-muted">
                              {l.eco_code}
                            </span>
                          )}
                        </span>
                        {l.summary && (
                          <span className="mt-0.5 block truncate text-xs text-text-muted">
                            {l.summary}
                          </span>
                        )}
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-text-muted" aria-hidden />
                    </Link>
                  ))}
                  <Link
                    href={ramo.browseHref}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border bg-surface px-3 py-2.5 text-sm font-medium text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
                  >
                    {ramo.browseLabel}
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </div>

                {/* DESKTOP: griglia di schede. */}
                <div className="hidden gap-3 md:grid md:grid-cols-2">
                  {items.map((l) => (
                    <Link key={l.slug} href={`/app/teoria/${l.slug}`} className="group">
                      <Card className="h-full transition-colors group-hover:border-text">
                        <CardHeader>
                          <div className="flex items-center justify-between gap-2">
                            <CardTitle>{l.title}</CardTitle>
                            {l.eco_code && (
                              <span className="font-mono text-xs text-text-muted">{l.eco_code}</span>
                            )}
                          </div>
                          {l.summary && <CardDescription>{l.summary}</CardDescription>}
                        </CardHeader>
                      </Card>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </section>
        );
      })}
    </div>
  );
}
