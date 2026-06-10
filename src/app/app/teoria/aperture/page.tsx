import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { activeLocale, pickLocale } from "@/lib/i18n/content";
import { Card, CardContent } from "@/components/ui/card";
import { OpeningTree, type OpeningNode } from "@/components/theory/OpeningTree";
import { MobilePageHeader } from "@/components/layout/MobilePageHeader";

export async function generateMetadata() {
  const t = await getTranslations("metadata");
  return { title: t("openings") };
}

interface Row {
  id: string;
  parent_id: string | null;
  slug: string;
  title_it: string | null;
  title_en: string | null;
  eco_code: string | null;
  summary_it: string | null;
  summary_en: string | null;
  line_pgn: string | null;
}

// Pagina della finestra di fetch: il catalogo ECO (0028) supera il tetto
// PostgREST di 1000 righe per richiesta, quindi si pagina con .range().
const PAGE = 1000;

export default async function AperturePage() {
  const supabase = await createClient();
  const locale = await activeLocale();
  const t = await getTranslations("theory");

  // NIENTE `body` nella lista: con ~3.700 righe il jsonb delle lezioni
  // peserebbe megabyte. `line_pgn` basta per sapere se la scheda esiste.
  const rows: Row[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data } = await supabase
      .from("content_items")
      .select("id, parent_id, slug, title_it, title_en, eco_code, summary_it, summary_en, line_pgn")
      .eq("type", "opening")
      .eq("published", true)
      .order("order_index", { ascending: true })
      .order("slug", { ascending: true })
      .range(from, from + PAGE - 1);
    const page = (data as Row[] | null) ?? [];
    rows.push(...page);
    if (page.length < PAGE) break;
  }

  // Title/summary risolti alla lingua attiva; il resto della forma resta invariato.
  const nodes: OpeningNode[] = rows.map((r) => ({
    id: r.id,
    parentId: r.parent_id,
    slug: r.slug,
    title: pickLocale(r.title_it, r.title_en, locale) ?? "",
    eco: r.eco_code,
    summary: pickLocale(r.summary_it, r.summary_en, locale),
    hasLesson: r.line_pgn !== null,
  }));

  return (
    <div className="space-y-6">
      <MobilePageHeader
        eyebrow={t("openings.eyebrow")}
        title={t("openings.title")}
        desc={t("openings.mobileDesc")}
      />
      <div className="hidden items-center justify-between gap-3 md:flex">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">{t("openings.title")}</h1>
          <p className="mt-2 text-text-muted">
            {t("openings.desc")}
          </p>
        </div>
        <Link href="/app/repertorio" className="text-sm text-text-muted hover:text-text">
          {t("openings.myRepertoire")} →
        </Link>
      </div>

      <Card>
        <CardContent className="py-4">
          <OpeningTree nodes={nodes} />
        </CardContent>
      </Card>
    </div>
  );
}
