import Link from "next/link";
import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatTile } from "./StatTile";
import { DistributionBar } from "./DistributionBar";
import { WeaknessRow } from "./WeaknessRow";
import { CompetenceRadar } from "./CompetenceRadar";
import { TrendLine } from "./TrendLine";
import { Glossary } from "./Glossary";
import { phaseLabel } from "@/lib/ai/format";
import type { DashboardData } from "@/lib/progress/aggregate";
import { MIN_TOTAL_SAMPLES, type OverallRating } from "@/lib/rating/aggregate";

const pct = (v: number | null): string => (v == null ? "—" : `${Math.round(v * 100)}%`);

/** Funzione di traduzione del namespace "dashboard" (server-side). */
type T = Awaited<ReturnType<typeof getTranslations<"dashboard">>>;

/** Card del Rating Shakh: numero complessivo (OTB) + scomposizione per dominio. */
function ShakhRatingCard({ rating, t }: { rating: OverallRating; t: T }) {
  const shown = rating.breakdown.filter((b) => b.rating != null);
  // Dati raccolti finora = somma dei campioni per dominio (coerente con la soglia
  // che decide `provisional` in aggregateOverall). Gap = quanti ancora ne mancano.
  const collected = rating.breakdown.reduce((s, b) => s + b.samples, 0);
  const missing = Math.max(0, MIN_TOTAL_SAMPLES - collected);
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>{t("shakhRating.title")}</CardTitle>
          {rating.provisional && <Badge variant="muted">{t("shakhRating.notCalibrated")}</Badge>}
        </div>
        <CardDescription>{t("shakhRating.desc")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-4xl font-semibold tabular-nums">
            {rating.rating != null ? rating.rating : "—"}
          </span>
          <span className="font-mono text-xs text-text-muted">± {rating.rd}</span>
        </div>
        {rating.provisional && (
          <p className="text-xs leading-relaxed text-text-muted">
            {missing > 0
              ? t.rich("shakhRating.notCalibratedDetail", {
                  collected,
                  total: MIN_TOTAL_SAMPLES,
                  missing,
                  mono: (chunks) => <span className="font-mono">{chunks}</span>,
                })
              : t("shakhRating.refining")}
          </p>
        )}
        {shown.length > 0 && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {shown.map((b) => (
              <div
                key={b.domain}
                className="rounded-md border border-border bg-surface-2 px-3 py-2"
              >
                <p className="text-xs text-text-muted">{b.label}</p>
                <p className="mt-0.5 flex items-center gap-1.5 font-mono text-sm tabular-nums">
                  {b.rating}
                  {b.provisional && (
                    <span
                      className="inline-block h-1.5 w-1.5 rounded-full bg-text-muted"
                      title={t("shakhRating.notCalibrated")}
                    />
                  )}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function kindLabel(kind: "game" | "puzzle" | "lesson", t: T): string {
  return kind === "game"
    ? t("kind.game")
    : kind === "puzzle"
      ? t("kind.puzzle")
      : t("kind.lesson");
}

export interface DashboardViewProps {
  data: DashboardData;
  /**
   * Vista in SOLA LETTURA (drill-down istruttore): niente azioni di
   * allenamento né link che porterebbero ai moduli dell'osservatore.
   */
  readOnly?: boolean;
  /** Slot inserito fra i punti deboli e le statistiche di gioco (es. NextStep). */
  middleSlot?: ReactNode;
  /**
   * Su telefono i blocchi di sintesi in alto (glossario, Rating Shakh, le quattro
   * tessere, lo slot prossimo passo) sono già resi dalla `MobileDashboardHero`:
   * con questo flag vengono nascosti sotto `md` per non duplicarli, restando
   * visibili da `md` in su.
   */
  heroOnMobile?: boolean;
}

/**
 * Corpo della dashboard dei progressi (prompt 08), riusabile sia per la propria
 * dashboard sia per il drill-down dell'istruttore su un allievo (prompt 09 §4).
 */
export async function DashboardView({
  data,
  readOnly = false,
  middleSlot,
  heroOnMobile = false,
}: DashboardViewProps) {
  const t = await getTranslations("dashboard");
  const radarAreas = data.competence.map((c) => ({ label: c.label, value: c.score }));
  // Sintesi in alto duplicata dall'hero mobile: nascosta sotto md quando attivo.
  const topHidden = heroOnMobile ? "hidden md:block" : undefined;

  return (
    <div className="space-y-8">
      {/* Legenda termini in alto: riferimento per principianti (non nel drill-down istruttore). */}
      {!readOnly && (
        <div className={topHidden}>
          <Glossary />
        </div>
      )}

      {/* 0. Rating Shakh olistico */}
      {data.shakhRating && (
        <div className={topHidden}>
          <ShakhRatingCard rating={data.shakhRating} t={t} />
        </div>
      )}

      {/* 1. Sintesi in alto */}
      <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-4", topHidden)}>
        <StatTile
          label={t("stat.pathLevel")}
          value={String(data.path.currentLevel)}
          sub={t("stat.pathNodes", {
            completed: data.path.completedNodes,
            total: data.path.totalNodes,
          })}
        />
        <StatTile
          label={t("stat.tacticalRating")}
          value={data.tactic.rating != null ? String(data.tactic.rating) : "—"}
          delta={data.tactic.delta}
          sub={t("stat.solved", { count: data.tactic.solved })}
        />
        <StatTile
          label={t("stat.streak")}
          value={String(data.tactic.currentStreak)}
          sub={t("stat.bestStreak", { best: data.tactic.bestStreak })}
        />
        <StatTile
          label={t("stat.accuracy")}
          value={pct(data.game.accuracy)}
          sub={t("stat.analyzedGames", { count: data.game.analyzed })}
        />
      </div>

      {data.synthesis && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle>{t("coach.title")}</CardTitle>
              <Badge variant="muted">{t("coach.latestSummary")}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm leading-relaxed">{data.synthesis.summary}</p>
            {data.synthesis.focusAreas.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {data.synthesis.focusAreas.map((a) => (
                  <Badge key={a}>{a}</Badge>
                ))}
              </div>
            )}
            {data.synthesis.suggestion && (
              <p className="text-sm text-text-muted">
                <span className="font-medium text-text">{t("coach.advice")} </span>
                {data.synthesis.suggestion}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* 2–3. Competenze + punti deboli */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("skillsMap.title")}</CardTitle>
            <CardDescription>{t("skillsMap.desc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <CompetenceRadar areas={radarAreas} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("weaknesses.title")}</CardTitle>
            {!readOnly && (
              <CardDescription>{t("weaknesses.desc")}</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {data.weaknesses.length === 0 ? (
              <p className="py-6 text-sm text-text-muted">
                {data.weaknessCoverage.attempts === 0
                  ? t("weaknesses.noData", {
                      minAttempts: data.weaknessCoverage.minAttempts,
                    })
                  : t("weaknesses.noneFlagged", {
                      attempts: data.weaknessCoverage.attempts,
                      trackedThemes: data.weaknessCoverage.trackedThemes,
                      minAttempts: data.weaknessCoverage.minAttempts,
                    })}
              </p>
            ) : readOnly ? (
              <div className="divide-y divide-border">
                {data.weaknesses.map((w) => (
                  <div key={w.label} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="min-w-0 truncate text-sm">{w.label}</span>
                    <span className="shrink-0 font-mono text-xs text-text-muted">
                      {Math.round(w.score * 100)}% · {t("weaknesses.attemptsShort", { count: w.attempts })}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="divide-y divide-border">
                {data.weaknesses.map((w) => (
                  <WeaknessRow
                    key={w.label}
                    label={w.label}
                    score={w.score}
                    attempts={w.attempts}
                    action={w.action}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {middleSlot && <div className={topHidden}>{middleSlot}</div>}

      {/* 5. Statistiche di gioco */}
      <Card>
        <CardHeader>
          <CardTitle>{t("gameStats.title")}</CardTitle>
          <CardDescription>{t("gameStats.desc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <DistributionBar
            inaccuracies={data.game.distribution.inaccuracies}
            mistakes={data.game.distribution.mistakes}
            blunders={data.game.distribution.blunders}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            {data.game.byColor
              .filter((c) => c.games > 0)
              .map((c) => (
                <StatTile
                  key={c.color}
                  label={c.color === "white" ? t("gameStats.asWhite") : t("gameStats.asBlack")}
                  value={pct(c.accuracy)}
                  sub={t("gameStats.gamesMoves", { games: c.games, moves: c.moves })}
                />
              ))}
          </div>

          {data.game.byPhase.some((p) => p.moves > 0) && (
            <div>
              <p className="mb-2 text-xs uppercase tracking-wide text-text-muted">
                {t("gameStats.accuracyByPhase")}
              </p>
              <div className="grid grid-cols-3 gap-3">
                {data.game.byPhase.map((p) => (
                  <div key={p.phase} className="rounded-md border border-border bg-surface p-3">
                    <p className="text-xs capitalize text-text-muted">{phaseLabel(p.phase)}</p>
                    <p className="font-display text-lg font-semibold tabular-nums">
                      {p.moves > 0 ? `${Math.round(p.score * 100)}%` : "—"}
                    </p>
                    {data.game.worstPhase === p.phase && (
                      <span className="text-[10px] text-text-muted">{t("gameStats.criticalArea")}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 6. Andamento */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("trendRating.title")}</CardTitle>
            <CardDescription>{t("trendRating.desc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <TrendLine
              points={data.trends.rating}
              dataNoun={{ one: t("trendRating.nounOne"), many: t("trendRating.nounMany") }}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("trendAccuracy.title")}</CardTitle>
            <CardDescription>{t("trendAccuracy.desc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <TrendLine
              points={data.trends.accuracy}
              suffix="%"
              dataNoun={{ one: t("trendAccuracy.nounOne"), many: t("trendAccuracy.nounMany") }}
            />
          </CardContent>
        </Card>
      </div>

      {/* 7. Attività recente */}
      {data.recent.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("recentActivity.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border">
              {data.recent.map((r, i) =>
                readOnly ? (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-3 py-2.5 text-sm"
                  >
                    <span className="min-w-0 truncate">
                      <span className="text-text-muted">{kindLabel(r.kind, t)} · </span>
                      {r.label}
                    </span>
                    <span className="shrink-0 font-mono text-xs text-text-muted">{r.detail}</span>
                  </div>
                ) : (
                  <Link
                    key={i}
                    href={r.href}
                    className="flex items-center justify-between gap-3 py-2.5 text-sm hover:opacity-80"
                  >
                    <span className="min-w-0 truncate">
                      <span className="text-text-muted">{kindLabel(r.kind, t)} · </span>
                      {r.label}
                    </span>
                    <span className="shrink-0 font-mono text-xs text-text-muted">{r.detail}</span>
                  </Link>
                ),
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
