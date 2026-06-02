import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Finali — Teoria — Shakh" };

interface Row {
  slug: string;
  title: string;
  summary: string | null;
  order_index: number;
}

export default async function FinaliPage() {
  const supabase = await createClient();
  // RLS: lettura pubblica solo dei contenuti published.
  const { data } = await supabase
    .from("content_items")
    .select("slug, title, summary, order_index")
    .eq("type", "endgame")
    .eq("published", true)
    .order("order_index", { ascending: true });

  // Ordinati per gerarchia classica (re e pedoni → torre → donna → matti…) via order_index.
  const lessons = (data as Row[] | null) ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <Link href="/app/teoria" className="text-sm text-text-muted hover:text-text">
          ← Teoria
        </Link>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">Finali</h1>
        <p className="mt-2 max-w-2xl text-text-muted">
          La tecnica dei finali, lezione e <em>pratica</em>: converti l&apos;esito contro
          la difesa perfetta della tablebase. Niente approssimazioni — la tablebase
          è verità assoluta.
        </p>
      </div>

      {lessons.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-center text-sm text-text-muted">
            Lezioni in arrivo.
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
