import Link from "next/link";
import type { ReactNode } from "react";
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
import type { OverallRating } from "@/lib/rating/aggregate";

const pct = (v: number | null): string => (v == null ? "—" : `${Math.round(v * 100)}%`);

/** Card del Rating Shakh: numero complessivo (OTB) + scomposizione per dominio. */
function ShakhRatingCard({ rating }: { rating: OverallRating }) {
  const shown = rating.breakdown.filter((b) => b.rating != null);
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Rating Shakh</CardTitle>
          {rating.provisional && <Badge variant="muted">non calibrato</Badge>}
        </div>
        <CardDescription>
          Stima di forza su scala reale (OTB), da puzzle, partite, finali, calcolo e qualità di gioco.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-4xl font-semibold tabular-nums">
            {rating.rating != null ? rating.rating : "—"}
          </span>
          <span className="font-mono text-xs text-text-muted">± {rating.rd}</span>
        </div>
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
                      title="non calibrato"
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

function kindLabel(kind: "game" | "puzzle" | "lesson"): string {
  return kind === "game" ? "Partita" : kind === "puzzle" ? "Puzzle" : "Lezione";
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
}

/**
 * Corpo della dashboard dei progressi (prompt 08), riusabile sia per la propria
 * dashboard sia per il drill-down dell'istruttore su un allievo (prompt 09 §4).
 */
export function DashboardView({ data, readOnly = false, middleSlot }: DashboardViewProps) {
  const radarAreas = data.competence.map((c) => ({ label: c.label, value: c.score }));

  return (
    <div className="space-y-8">
      {/* Legenda termini in alto: riferimento per principianti (non nel drill-down istruttore). */}
      {!readOnly && <Glossary />}

      {/* 0. Rating Shakh olistico */}
      {data.shakhRating && <ShakhRatingCard rating={data.shakhRating} />}

      {/* 1. Sintesi in alto */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          label="Livello percorso"
          value={String(data.path.currentLevel)}
          sub={`${data.path.completedNodes}/${data.path.totalNodes} nodi`}
        />
        <StatTile
          label="Rating tattico"
          value={data.tactic.rating != null ? String(data.tactic.rating) : "—"}
          delta={data.tactic.delta}
          sub={`${data.tactic.solved} risolti`}
        />
        <StatTile
          label="Streak"
          value={String(data.tactic.currentStreak)}
          sub={`record ${data.tactic.bestStreak}`}
        />
        <StatTile
          label="Accuratezza"
          value={pct(data.game.accuracy)}
          sub={`${data.game.analyzed} partite`}
        />
      </div>

      {data.synthesis && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle>Il coach dice</CardTitle>
              <Badge variant="muted">ultima sintesi</Badge>
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
                <span className="font-medium text-text">Consiglio: </span>
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
            <CardTitle>Mappa delle competenze</CardTitle>
            <CardDescription>Profilo sulle cinque aree.</CardDescription>
          </CardHeader>
          <CardContent>
            <CompetenceRadar areas={radarAreas} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Punti deboli prioritari</CardTitle>
            {!readOnly && (
              <CardDescription>Ognuno con l&apos;allenamento giusto.</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {data.weaknesses.length === 0 ? (
              <p className="py-6 text-sm text-text-muted">
                Nessun punto debole marcato: servono più dati.
              </p>
            ) : readOnly ? (
              <div className="divide-y divide-border">
                {data.weaknesses.map((w) => (
                  <div key={w.label} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="min-w-0 truncate text-sm">{w.label}</span>
                    <span className="shrink-0 font-mono text-xs text-text-muted">
                      {Math.round(w.score * 100)}% · {w.attempts} tent.
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

      {middleSlot}

      {/* 5. Statistiche di gioco */}
      <Card>
        <CardHeader>
          <CardTitle>Statistiche di gioco</CardTitle>
          <CardDescription>Dalle partite analizzate.</CardDescription>
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
                  label={c.color === "white" ? "Col Bianco" : "Col Nero"}
                  value={pct(c.accuracy)}
                  sub={`${c.games} partite · ${c.moves} mosse`}
                />
              ))}
          </div>

          {data.game.byPhase.some((p) => p.moves > 0) && (
            <div>
              <p className="mb-2 text-xs uppercase tracking-wide text-text-muted">
                Accuratezza per fase
              </p>
              <div className="grid grid-cols-3 gap-3">
                {data.game.byPhase.map((p) => (
                  <div key={p.phase} className="rounded-md border border-border bg-surface p-3">
                    <p className="text-xs capitalize text-text-muted">{phaseLabel(p.phase)}</p>
                    <p className="font-display text-lg font-semibold tabular-nums">
                      {p.moves > 0 ? `${Math.round(p.score * 100)}%` : "—"}
                    </p>
                    {data.game.worstPhase === p.phase && (
                      <span className="text-[10px] text-text-muted">punto critico</span>
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
            <CardTitle>Rating tattico</CardTitle>
            <CardDescription>Andamento nel tempo.</CardDescription>
          </CardHeader>
          <CardContent>
            <TrendLine points={data.trends.rating} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Accuratezza partite</CardTitle>
            <CardDescription>Una percentuale per partita.</CardDescription>
          </CardHeader>
          <CardContent>
            <TrendLine points={data.trends.accuracy} suffix="%" />
          </CardContent>
        </Card>
      </div>

      {/* 7. Attività recente */}
      {data.recent.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Attività recente</CardTitle>
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
                      <span className="text-text-muted">{kindLabel(r.kind)} · </span>
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
                      <span className="text-text-muted">{kindLabel(r.kind)} · </span>
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
