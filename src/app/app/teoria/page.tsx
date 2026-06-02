import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { TheoryType } from "@/lib/theory/types";

export const metadata = { title: "Teoria — Shakh" };

const RAMI: { type: TheoryType; title: string; desc: string }[] = [
  { type: "opening", title: "Aperture", desc: "Idee e piani delle aperture, ancorati a cosa si gioca davvero." },
  { type: "middlegame", title: "Mediogioco", desc: "Temi strategici: struttura di pedoni, pezzi forti, piani." },
  { type: "endgame", title: "Finali", desc: "Tecnica dei finali, con la verità esatta della tablebase." },
];

interface LessonRow {
  slug: string;
  title: string;
  summary: string | null;
  type: TheoryType;
  eco_code: string | null;
  order_index: number;
}

export default async function TeoriaPage() {
  const supabase = await createClient();
  // Solo le lezioni pubblicate (RLS: lettura pubblica dei contenuti published).
  const { data } = await supabase
    .from("content_items")
    .select("slug, title, summary, type, eco_code, order_index")
    .eq("published", true)
    .order("order_index", { ascending: true });

  const lessons = (data as LessonRow[] | null) ?? [];
  const byType = (t: TheoryType) => lessons.filter((l) => l.type === t);

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Teoria</h1>
        <p className="mt-2 max-w-2xl text-text-muted">
          Lezioni guidate sopra la scacchiera: capisci il <em>perché</em> delle mosse,
          con i dati reali dell&apos;explorer e la verità esatta dei finali.
        </p>
      </div>

      {RAMI.map((ramo) => {
        const items = byType(ramo.type);
        return (
          <section key={ramo.type} className="space-y-4">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-display text-xl font-semibold tracking-tight">{ramo.title}</h2>
              {ramo.type === "opening" ? (
                <Link href="/app/teoria/aperture" className="text-sm text-text-muted hover:text-text">
                  Sfoglia l&apos;albero ECO →
                </Link>
              ) : ramo.type === "endgame" ? (
                <Link href="/app/teoria/finali" className="text-sm text-text-muted hover:text-text">
                  Sfoglia tutti i finali →
                </Link>
              ) : ramo.type === "middlegame" ? (
                <Link href="/app/teoria/mediogioco" className="text-sm text-text-muted hover:text-text">
                  Sfoglia i temi →
                </Link>
              ) : (
                <span className="text-sm text-text-muted">{ramo.desc}</span>
              )}
            </div>

            {items.length === 0 ? (
              <Card>
                <CardContent className="py-6 text-center text-sm text-text-muted">
                  Lezioni in arrivo. <Badge className="ml-1">presto</Badge>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
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
            )}
          </section>
        );
      })}
    </div>
  );
}
