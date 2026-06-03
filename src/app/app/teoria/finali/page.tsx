import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { hasPractice } from "@/lib/theory/endgame";
import { loadDomainRatings } from "@/lib/rating/store";

export const metadata = { title: "Finali — Teoria — Shakh" };

interface Row {
  slug: string;
  title: string;
  summary: string | null;
  order_index: number;
  body: unknown;
}

interface LessonView {
  slug: string;
  title: string;
  summary: string | null;
  progressKey: string | null;
  score: number | null;
  attempts: number;
}

export default async function FinaliPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data }, { data: progress }, domains] = await Promise.all([
    supabase
      .from("content_items")
      .select("slug, title, summary, order_index, body")
      .eq("type", "endgame")
      .eq("published", true)
      .order("order_index", { ascending: true }),
    supabase
      .from("user_progress")
      .select("key, score, attempts")
      .eq("user_id", user!.id)
      .eq("dimension", "endgame"),
    loadDomainRatings(supabase, user!.id),
  ]);

  const progressByKey = new Map(
    ((progress as { key: string; score: number; attempts: number }[] | null) ?? []).map((r) => [
      r.key,
      r,
    ]),
  );

  const lessons: LessonView[] = ((data as Row[] | null) ?? []).map((l) => {
    const key = hasPractice(l.body) ? l.body.practice.progressKey : null;
    const p = key ? progressByKey.get(key) : undefined;
    return {
      slug: l.slug,
      title: l.title,
      summary: l.summary,
      progressKey: key,
      score: p?.score ?? null,
      attempts: p?.attempts ?? 0,
    };
  });

  // Consigliato: prima pratica mai tentata, altrimenti quella con competenza più bassa.
  const practicable = lessons.filter((l) => l.progressKey);
  const recommended =
    practicable.find((l) => l.attempts === 0)?.slug ??
    practicable.slice().sort((a, b) => (a.score ?? 0) - (b.score ?? 0))[0]?.slug ??
    null;

  const endgame = domains.find((d) => d.domain === "endgame");
  const endgameRating = endgame && endgame.samples > 0 ? Math.round(endgame.state.rating) : null;

  return (
    <div className="space-y-8">
      <div>
        <Link href="/app/teoria" className="text-sm text-text-muted hover:text-text">
          ← Teoria
        </Link>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <h1 className="font-display text-3xl font-semibold tracking-tight">Finali</h1>
          <div className="text-right">
            <div className="font-mono text-2xl tabular-nums">{endgameRating ?? "—"}</div>
            <div className="text-xs uppercase tracking-wide text-text-muted">rating finali</div>
          </div>
        </div>
        <p className="mt-2 max-w-2xl text-text-muted">
          La tecnica dei finali, lezione e <em>pratica</em>: converti l&apos;esito contro
          la difesa perfetta della tablebase. Niente approssimazioni — la tablebase
          è verità assoluta. Ogni conversione aggiorna il tuo rating finali.
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
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle>{l.title}</CardTitle>
                    {l.slug === recommended && <Badge>consigliato</Badge>}
                  </div>
                  {l.summary && <CardDescription>{l.summary}</CardDescription>}
                </CardHeader>
                {l.progressKey && (
                  <CardContent>
                    <CompetenceTag score={l.score} attempts={l.attempts} />
                  </CardContent>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/** Etichetta di competenza per una pratica di finale. */
function CompetenceTag({ score, attempts }: { score: number | null; attempts: number }) {
  if (attempts === 0) {
    return <span className="text-xs text-text-muted">Mai praticato</span>;
  }
  const pct = Math.round((score ?? 0) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-text" style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono text-xs tabular-nums text-text-muted">{pct}%</span>
    </div>
  );
}
