import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { MessageSquare, Send } from "lucide-react";
import { createClient, getUser } from "@/lib/supabase/server";
import { loadUserMetrics } from "@/lib/ai/userMetrics";
import { phaseLabel } from "@/lib/ai/format";
import type { PhaseStats } from "@/lib/ai/types";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PatternSynthesis } from "@/components/coach/PatternSynthesis";
import { MobilePageHeader } from "@/components/layout/MobilePageHeader";

/* Riga fase con barra qualità. La fase peggiore è marcata: è l'UNICO punto in cui
   i colori --eval-* sono ammessi nella UI (contesto analisi mosse). */
function PhaseRow({
  p,
  worst,
  weakestLabel,
  labels,
}: {
  p: PhaseStats;
  worst: boolean;
  weakestLabel: string;
  labels: { moves: string; inacc: string; mistakes: string; blunders: string };
}) {
  const pct = p.moves > 0 ? Math.round(p.score * 100) : 0;
  return (
    <div className="py-3">
      <div className="flex items-baseline justify-between">
        <span className="flex items-center gap-2 text-sm font-medium capitalize">
          {phaseLabel(p.phase)}
          {worst && (
            <span className="font-mono text-[10px] uppercase tracking-wide text-eval-mistake">
              {weakestLabel}
            </span>
          )}
        </span>
        <span className="font-mono text-sm tabular-nums">
          {p.moves > 0 ? `${pct}%` : "—"}
        </span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
        <div
          className={cn("h-full rounded-full", worst ? "bg-eval-mistake" : "bg-text")}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-2 flex gap-4 font-mono text-[11px] text-text-muted">
        <span>
          {p.moves} {labels.moves}
        </span>
        <span>
          {p.inaccuracies} {labels.inacc}
        </span>
        <span>
          {p.mistakes} {labels.mistakes}
        </span>
        <span>
          {p.blunders} {labels.blunders}
        </span>
      </div>
    </div>
  );
}

export default async function CoachPage() {
  const supabase = await createClient();
  const t = await getTranslations("study");
  const user = await getUser();
  if (!user) redirect("/login");

  const metrics = await loadUserMetrics(supabase, user.id);
  const coachConfigured = Boolean(process.env.ANTHROPIC_API_KEY);
  const hasData = metrics.userMoves > 0;

  const phaseLabels = {
    moves: t("coach.table.moves").toLowerCase(),
    inacc: t("coach.table.inacc").toLowerCase().replace(".", ""),
    mistakes: t("coach.table.mistakes").toLowerCase(),
    blunders: t("coach.table.blunders").toLowerCase(),
  };

  return (
    <div className="space-y-8">
      <MobilePageHeader
        eyebrow={t("coach.eyebrow")}
        title={t("coach.title")}
        desc={t("coach.desc")}
      />

      {!hasData ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("coach.noData.title")}</CardTitle>
            <CardDescription>{t("coach.noData.desc")}</CardDescription>
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
          {/* ── MOBILE: tabella + sintesi (presentazione invariata) ── */}
          <div className="space-y-8 md:hidden">
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
                <CardDescription>{t("coach.summary.desc")}</CardDescription>
              </CardHeader>
              <CardContent>
                <PatternSynthesis coachConfigured={coachConfigured} hasData={hasData} />
              </CardContent>
            </Card>
          </div>

          {/* ── DESKTOP: redesign Variante B · Conversation ── */}
          <div className="hidden md:block">
            <div className="mx-auto max-w-6xl space-y-6">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-widest text-text-muted">
                  {t("coach.eyebrow")}
                </p>
                <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight">
                  {t("coach.title")}
                </h1>
              </div>

              <div className="grid grid-cols-[18rem_1fr] gap-6">
                {/* Rail metriche per fase */}
                <div className="space-y-4">
                  <div className="rounded-2xl border border-border bg-surface p-5">
                    <p className="text-xs uppercase tracking-wider text-text-muted">
                      {t("coach.errorsByPhase.title")}
                    </p>
                    <div className="mt-2 divide-y divide-border">
                      {metrics.byPhase.map((p) => (
                        <PhaseRow
                          key={p.phase}
                          p={p}
                          worst={metrics.worstPhase === p.phase}
                          weakestLabel={t("coach.weakest")}
                          labels={phaseLabels}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border bg-surface p-5">
                    <p className="font-mono text-2xl font-semibold tabular-nums">{metrics.games}</p>
                    <p className="mt-1 font-mono text-[11px] text-text-muted">
                      {t("coach.errorsByPhase.desc", {
                        games: metrics.games,
                        moves: metrics.userMoves,
                      })}
                    </p>
                  </div>
                </div>

                {/* Chat */}
                <div className="flex min-h-[34rem] flex-col rounded-2xl border border-border bg-surface">
                  <div className="flex items-center gap-2 border-b border-border px-5 py-3">
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-text font-display text-bg">
                      ♞
                    </span>
                    <div>
                      <p className="text-sm font-medium">{t("coach.title")}</p>
                      <p className="font-mono text-[10px] text-text-muted">
                        {t("coach.summary.desc")}
                      </p>
                    </div>
                  </div>

                  {/* Messaggi — bolla del coach con la sintesi AI (isola client). */}
                  <div className="flex-1 space-y-4 overflow-y-auto p-5">
                    <div className="flex gap-3">
                      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface-2 font-display">
                        ♞
                      </span>
                      <div className="w-full max-w-2xl rounded-2xl rounded-tl-sm border border-border bg-bg px-4 py-3">
                        <PatternSynthesis coachConfigured={coachConfigured} hasData={hasData} />
                      </div>
                    </div>
                  </div>

                  {/* Input — affordance visiva non interattiva: nessun endpoint
                      Q&A è cablato su questa pagina. */}
                  <div className="border-t border-border p-3">
                    <div className="flex items-center gap-2 rounded-xl border border-border bg-bg px-3 py-2">
                      <MessageSquare className="h-4 w-4 shrink-0 text-text-muted" />
                      <span className="flex-1 text-sm text-text-muted">{t("coach.summary.desc")}</span>
                      <span
                        aria-hidden
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-text text-bg opacity-60"
                      >
                        <Send className="h-4 w-4" />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
