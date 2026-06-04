import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MobilePageHeader } from "@/components/layout/MobilePageHeader";

export const metadata = { title: "Middlegame — Theory — Shakh" };

interface Row {
  slug: string;
  title: string;
  summary: string | null;
  order_index: number;
}

export default async function MediogiocoPage() {
  const supabase = await createClient();
  // RLS: lettura pubblica solo dei contenuti published.
  const { data } = await supabase
    .from("content_items")
    .select("slug, title, summary, order_index")
    .eq("type", "middlegame")
    .eq("published", true)
    .order("order_index", { ascending: true });

  // Organizzati PER TEMA (non per apertura).
  const lessons = (data as Row[] | null) ?? [];

  return (
    <div className="space-y-8">
      <MobilePageHeader
        eyebrow="Strategic themes"
        title="Middlegame"
        desc="Plans for both sides and “find the plan” exercises."
      />
      <div className="hidden md:block">
        <Link href="/app/teoria" className="text-sm text-text-muted hover:text-text">
          ← Theory
        </Link>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">Middlegame</h1>
        <p className="mt-2 max-w-2xl text-text-muted">
          Strategic themes on typical positions: plans for both sides and
          &quot;find the plan&quot; exercises, evaluated by the engine and commented by the coach.
        </p>
      </div>

      {lessons.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-center text-sm text-text-muted">
            Lessons coming soon.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {lessons.map((l) => (
            <Link key={l.slug} href={`/app/teoria/${l.slug}`} className="group">
              <Card className="h-full transition-colors group-hover:border-text">
                <CardHeader>
                  <CardTitle>{l.title}</CardTitle>
                  {l.summary && <CardDescription>{l.summary}</CardDescription>}
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
