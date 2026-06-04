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
        eyebrow="Your coach"
        title="Coach"
        desc="A summary of your recurring weaknesses from your game data."
      />
      <div className="hidden md:block">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Coach</h1>
        <p className="mt-2 text-text-muted">
          The coach analyzes your game data (computed by the engine) and summarizes your
          recurring weaknesses. For move-by-move explanations, open a game from the{" "}
          <Link href="/app/partite" className="underline">
            review
          </Link>
          .
        </p>
      </div>

      {!hasData ? (
        <Card>
          <CardHeader>
            <CardTitle>No data yet</CardTitle>
            <CardDescription>
              Import and analyze a few games: the coach&apos;s summary is based on the errors
              detected by the engine.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/app/partite">
              <Button variant="secondary" size="sm">
                Go to games
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Your errors by phase</CardTitle>
              <CardDescription>
                Across {metrics.games} games, {metrics.userMoves} of your moves examined.
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[26rem] text-sm">
                <thead>
                  <tr className="text-text-muted">
                    <th className="text-left font-normal">Phase</th>
                    <th className="px-2 py-1 text-right font-normal">Moves</th>
                    <th className="px-2 py-1 text-right font-normal">Inacc.</th>
                    <th className="px-2 py-1 text-right font-normal">Mistakes</th>
                    <th className="px-2 py-1 text-right font-normal">Blunders</th>
                    <th className="px-2 py-1 text-right font-normal">Quality</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.byPhase.map((p) => (
                    <tr key={p.phase} className="border-t border-border">
                      <td className="py-1.5 capitalize">
                        {phaseLabel(p.phase)}
                        {metrics.worstPhase === p.phase && (
                          <span className="ml-2 text-xs text-eval-mistake">weakest</span>
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
              <CardTitle>Coach summary</CardTitle>
              <CardDescription>
                A motivating, actionable recap of your error patterns.
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
