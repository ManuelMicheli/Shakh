import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient, getUser } from "@/lib/supabase/server";
import { loadUserMetrics } from "@/lib/ai/userMetrics";
import { phaseLabel } from "@/lib/ai/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PatternSynthesis } from "@/components/coach/PatternSynthesis";
import { MobilePageHeader } from "@/components/layout/MobilePageHeader";

export default async function CoachPage() {
  const supabase = await createClient();
  const user = await getUser();
  if (!user) redirect("/login");

  const metrics = await loadUserMetrics(supabase, user.id);
  const coachConfigured = Boolean(process.env.ANTHROPIC_API_KEY);
  const hasData = metrics.userMoves > 0;

  return (
    <div className="space-y-8">
      <MobilePageHeader
        eyebrow="Il tuo allenatore"
        title="Coach"
        desc="Sintesi dei tuoi punti deboli ricorrenti dai dati delle partite."
      />
      <div className="hidden md:block">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Coach</h1>
        <p className="mt-2 text-text-muted">
          Il coach analizza i dati delle tue partite (calcolati dal motore) e sintetizza i tuoi
          punti deboli ricorrenti. Per spiegazioni mossa per mossa apri una partita dalla{" "}
          <Link href="/app/partite" className="underline">
            revisione
          </Link>
          .
        </p>
      </div>

      {!hasData ? (
        <Card>
          <CardHeader>
            <CardTitle>Nessun dato ancora</CardTitle>
            <CardDescription>
              Importa e analizza qualche partita: la sintesi del coach si basa sugli errori
              rilevati dal motore.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/app/partite">
              <Button variant="secondary" size="sm">
                Vai alle partite
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>I tuoi errori per fase</CardTitle>
              <CardDescription>
                Su {metrics.games} partite, {metrics.userMoves} tue mosse esaminate.
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[26rem] text-sm">
                <thead>
                  <tr className="text-text-muted">
                    <th className="text-left font-normal">Fase</th>
                    <th className="px-2 py-1 text-right font-normal">Mosse</th>
                    <th className="px-2 py-1 text-right font-normal">Impr.</th>
                    <th className="px-2 py-1 text-right font-normal">Errori</th>
                    <th className="px-2 py-1 text-right font-normal">Gravi</th>
                    <th className="px-2 py-1 text-right font-normal">Qualità</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.byPhase.map((p) => (
                    <tr key={p.phase} className="border-t border-border">
                      <td className="py-1.5 capitalize">
                        {phaseLabel(p.phase)}
                        {metrics.worstPhase === p.phase && (
                          <span className="ml-2 text-xs text-eval-mistake">più debole</span>
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono">{p.moves}</td>
                      <td className="px-2 py-1.5 text-right font-mono">{p.inaccuracies}</td>
                      <td className="px-2 py-1.5 text-right font-mono">{p.mistakes}</td>
                      <td className="px-2 py-1.5 text-right font-mono">{p.blunders}</td>
                      <td className="px-2 py-1.5 text-right font-mono">
                        {p.moves > 0 ? `${(p.score * 100).toFixed(0)}%` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sintesi del coach</CardTitle>
              <CardDescription>
                Un riassunto motivante e azionabile dei tuoi pattern d&apos;errore.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PatternSynthesis coachConfigured={coachConfigured} hasData={hasData} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
