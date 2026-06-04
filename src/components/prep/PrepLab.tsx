"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { scoutOpponent, type ScoutResult } from "@/app/app/preparazione/actions";
import type { OpeningStat, WeakOpening } from "@/lib/prep/scout";

type Source = "lichess" | "chesscom";

export function PrepLab() {
  const [username, setUsername] = useState("");
  const [source, setSource] = useState<Source>("lichess");
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<ScoutResult | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || loading) return;
    setLoading(true);
    setRes(null);
    const r = await scoutOpponent({ username: username.trim(), source });
    setRes(r);
    setLoading(false);
  }

  const report = res?.ok ? res.report : undefined;

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="space-y-3">
        <div className="flex gap-2">
          {(["lichess", "chesscom"] as Source[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSource(s)}
              className={cn(
                "rounded-md border px-3 py-1.5 text-sm transition-colors",
                source === s
                  ? "border-text bg-text text-bg"
                  : "border-border text-text-muted hover:text-text",
              )}
            >
              {s === "lichess" ? "Lichess" : "Chess.com"}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={`Username ${source === "lichess" ? "Lichess" : "Chess.com"}`}
            className="flex-1"
          />
          <Button type="submit" disabled={loading || !username.trim()}>
            {loading ? "Analyzing…" : "Analyze"}
          </Button>
        </div>
      </form>

      {res && !res.ok && (
        <Card>
          <CardContent className="py-4 text-sm text-text-muted">{res.error}</CardContent>
        </Card>
      )}

      {report && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Games" value={report.total} />
            <Stat label="As White" value={report.whiteGames} />
            <Stat label="As Black" value={report.blackGames} />
          </div>

          {report.weakest.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Weak spots to target</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {report.weakest.map((w) => (
                  <WeakRow key={`${w.color}-${w.key}`} w={w} />
                ))}
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <OpeningColumn title="Plays as White" stats={report.asWhite} />
            <OpeningColumn title="Plays as Black" stats={report.asBlack} />
          </div>
        </div>
      )}
    </div>
  );
}

function OpeningColumn({ title, stats }: { title: string; stats: OpeningStat[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {stats.length === 0 ? (
          <p className="text-sm text-text-muted">No data.</p>
        ) : (
          stats.map((o) => <OpeningRow key={o.key} o={o} />)
        )}
      </CardContent>
    </Card>
  );
}

function OpeningRow({ o }: { o: OpeningStat }) {
  return (
    <div className="flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">
          {o.key}
          {o.eco && <span className="ml-1 font-mono text-xs text-text-muted">{o.eco}</span>}
        </p>
      </div>
      <span className="shrink-0 text-xs text-text-muted">{o.games} g.</span>
      <span className="shrink-0 font-mono text-xs tabular-nums">{o.scorePct}%</span>
    </div>
  );
}

function WeakRow({ w }: { w: WeakOpening }) {
  return (
    <div className="flex items-center gap-3">
      <Badge variant="muted" className="shrink-0">
        {w.color === "white" ? "W" : "B"}
      </Badge>
      <p className="min-w-0 flex-1 truncate text-sm">
        {w.key}
        {w.eco && <span className="ml-1 font-mono text-xs text-text-muted">{w.eco}</span>}
      </p>
      <span className="shrink-0 text-xs text-text-muted">{w.games} g.</span>
      <span className="shrink-0 font-mono text-xs tabular-nums">scores {w.scorePct}%</span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="text-xs uppercase tracking-wide text-text-muted">{label}</div>
      <div className="mt-1 font-mono text-2xl tabular-nums">{value}</div>
    </div>
  );
}
