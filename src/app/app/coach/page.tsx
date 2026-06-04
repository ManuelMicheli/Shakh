import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient, getUser } from "@/lib/supabase/server";
import { loadUserMetrics } from "@/lib/ai/userMetrics";
import { phaseLabel } from "@/lib/ai/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PatternSynthesis } from "@/components/coach/PatternSynthesis";
import { MobilePageHeader } from "@/components/layout/MobilePageHeader";

export default async function CoachPage() {
  const supabase = await createClient();
  const t = await getTranslations("study");
  const user = await getUser();
  if (!user) redirect("/login");

  const metrics = await loadUserMetrics(supabase, user.id);
  const coachConfigured = Boolean(process.env.ANTHROPIC_API_KEY);
  const hasData = metrics.userMoves > 0;

  return (
    <div className="space-y-8">
      <MobilePageHeader
        eyebrow={t("coach.eyebrow")}
        title={t("coach.title")}
        desc={t("coach.desc")}
      />
      <div className="hidden md:block">
        <h1 className="font-display text-3xl font-semibold tracking-tight">{t("coach.title")}</h1>
        <p className="mt-2 text-text-muted">
          {t("coach.intro.before")}{" "}
          <Link href="/app/partite" className="underline">
            {t("coach.intro.link")}
          </Link>
          {t("coach.intro.after")}
        </p>
      </div>

      {!hasData ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("coach.noData.title")}</CardTitle>
            <CardDescription>
              {t("coach.noData.desc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/app/partite">
              <Button variant="secondary" size="sm">
                {t("coach.goToGames")}
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{t("coach.errorsByPhase.title")}</CardTitle>
              <CardDescription>
                {t("coach.errorsByPhase.desc", { games: metrics.games, moves: metrics.userMoves })}
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[26rem] text-sm">
                <thead>
                  <tr className="text-text-muted">
                    <th className="text-left font-normal">{t("coach.table.phase")}</th>
                    <th className="px-2 py-1 text-right font-normal">{t("coach.table.moves")}</th>
                    <th className="px-2 py-1 text-right font-normal">{t("coach.table.inacc")}</th>
                    <th className="px-2 py-1 text-right font-normal">{t("coach.table.mistakes")}</th>
                    <th className="px-2 py-1 text-right font-normal">{t("coach.table.blunders")}</th>
                    <th className="px-2 py-1 text-right font-normal">{t("coach.table.quality")}</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.byPhase.map((p) => (
                    <tr key={p.phase} className="border-t border-border">
                      <td className="py-1.5 capitalize">
                        {phaseLabel(p.phase)}
                        {metrics.worstPhase === p.phase && (
                          <span className="ml-2 text-xs text-eval-mistake">{t("coach.weakest")}</span>
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
              <CardTitle>{t("coach.summary.title")}</CardTitle>
              <CardDescription>
                {t("coach.summary.desc")}
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
