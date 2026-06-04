import Link from "next/link";
import { createClient, getUser } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { loadWeaknesses, MIN_ANALYZED_GAMES, type WeaknessPattern } from "@/lib/weakness/engine";
import { AnalyzePendingButton } from "@/components/analysis/AnalyzePendingButton";
import { MobilePageHeader } from "@/components/layout/MobilePageHeader";

export const metadata = { title: "Weaknesses — Shakh" };

export default async function DebolezzePage() {
  const supabase = await createClient();
  const user = await getUser();

  const { analyzedGames, patterns } = await loadWeaknesses(supabase, user!.id);

  // Partite importate ma ancora da analizzare: alimentano la CTA di bootstrap.
  const { count: pendingCount } = await supabase
    .from("games")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user!.id)
    .eq("analyzed", false);
  const pendingGames = pendingCount ?? 0;

  return (
    <div className="space-y-8">
      <MobilePageHeader
        eyebrow="Recurring patterns"
        title="Weaknesses"
        desc="The losses that repeat, grouped and sorted by severity."
      />
      <div className="hidden md:block">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Weaknesses</h1>
        <p className="mt-2 max-w-2xl text-text-muted">
          Not single mistakes, but the losses that <em>repeat</em> across your games.
          The engine groups them, sorts them by severity, and points you to where to train.
        </p>
      </div>

      {analyzedGames < MIN_ANALYZED_GAMES ? (
        <EmptyState analyzed={analyzedGames} pending={pendingGames} />
      ) : patterns.length === 0 ? (
        <NoPatterns />
      ) : (
        <div className="space-y-3">
          {patterns.map((p) => (
            <PatternCard key={p.id} pattern={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function PatternCard({ pattern }: { pattern: WeaknessPattern }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-lg">{pattern.label}</CardTitle>
          <Badge variant="muted">{pattern.occurrences}×</Badge>
        </div>
        <CardDescription>{pattern.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <SeverityBar value={pattern.severity} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
            <span>Examples:</span>
            {pattern.examples.map((ex, i) => (
              <Link
                key={`${ex.gameId}-${ex.ply}`}
                href={`/app/partite/${ex.gameId}`}
                className="font-mono underline-offset-2 hover:underline"
              >
                game {i + 1} (move {Math.ceil(ex.ply / 2)})
              </Link>
            ))}
          </div>
          <Link href={pattern.action.href}>
            <Button size="sm">{pattern.action.label}</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

/** Barra di gravità monocroma (più piena = più grave). */
function SeverityBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs uppercase tracking-wide text-text-muted">Severity</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-text" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function EmptyState({ analyzed, pending }: { analyzed: number; pending: number }) {
  return (
    <Card>
      <CardContent className="space-y-3 py-6 text-center">
        <p className="text-text-muted">
          You need at least {MIN_ANALYZED_GAMES} analyzed games to detect reliable
          patterns. You have {analyzed}
          {pending > 0
            ? `, but ${pending} imported are still waiting to be analyzed.`
            : "."}
        </p>
        {pending > 0 ? (
          <div className="flex flex-col items-center gap-2">
            <AnalyzePendingButton pending={pending} />
            <Link
              href="/app/partite"
              className="text-xs text-text-muted underline-offset-2 hover:underline"
            >
              Manage all games
            </Link>
          </div>
        ) : (
          <Link href="/app/partite">
            <Button>Import and analyze games</Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

function NoPatterns() {
  return (
    <Card>
      <CardContent className="py-6 text-center text-text-muted">
        No recurring weaknesses stand out in your recent games. Keep it up —
        analyze more games to sharpen the picture.
      </CardContent>
    </Card>
  );
}
