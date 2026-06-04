import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { OpeningTree, type OpeningNode } from "@/components/theory/OpeningTree";
import { MobilePageHeader } from "@/components/layout/MobilePageHeader";

export const metadata = { title: "Aperture — Shakh" };

interface Row {
  id: string;
  parent_id: string | null;
  slug: string;
  title: string;
  eco_code: string | null;
  summary: string | null;
  body: unknown | null;
}

export default async function AperturePage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("content_items")
    .select("id, parent_id, slug, title, eco_code, summary, body")
    .eq("type", "opening")
    .eq("published", true)
    .order("order_index", { ascending: true });

  const nodes: OpeningNode[] = ((data as Row[] | null) ?? []).map((r) => ({
    id: r.id,
    parentId: r.parent_id,
    slug: r.slug,
    title: r.title,
    eco: r.eco_code,
    summary: r.summary,
    hasLesson: r.body !== null,
  }));

  return (
    <div className="space-y-6">
      <MobilePageHeader
        eyebrow="Albero ECO"
        title="Aperture"
        desc="Famiglie, aperture e varianti. Apri una lezione per studiarla."
        piece="bishop"
      />
      <div className="hidden items-center justify-between gap-3 md:flex">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Aperture</h1>
          <p className="mt-2 text-text-muted">
            Naviga l&apos;albero ECO: famiglie, aperture e varianti. Apri una lezione
            per studiarla sulla scacchiera.
          </p>
        </div>
        <Link href="/app/repertorio" className="text-sm text-text-muted hover:text-text">
          Il mio repertorio →
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
