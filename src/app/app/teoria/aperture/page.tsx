import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { OpeningTree, type OpeningNode } from "@/components/theory/OpeningTree";
import { MobilePageHeader } from "@/components/layout/MobilePageHeader";

export const metadata = { title: "Openings — Shakh" };

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
        eyebrow="ECO tree"
        title="Openings"
        desc="Families, openings and variations. Open a lesson to study it."
      />
      <div className="hidden items-center justify-between gap-3 md:flex">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Openings</h1>
          <p className="mt-2 text-text-muted">
            Browse the ECO tree: families, openings and variations. Open a lesson
            to study it on the board.
          </p>
        </div>
        <Link href="/app/repertorio" className="text-sm text-text-muted hover:text-text">
          My repertoire →
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
