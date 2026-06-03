import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { loadWeaknesses, MIN_ANALYZED_GAMES, type WeaknessPattern } from "@/lib/weakness/engine";

export const metadata = { title: "Punti deboli — Shakh" };

export default async function DebolezzePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { analyzedGames, patterns } = await loadWeaknesses(supabase, user!.id);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Punti deboli</h1>
        <p className="mt-2 max-w-2xl text-text-muted">
          Non i singoli errori, ma le perdite che si <em>ripetono</em> fra le tue partite.
          Il motore le raggruppa, le ordina per gravità e ti indica dove allenarti.
        </p>
      </div>

      {analyzedGames < MIN_ANALYZED_GAMES ? (
        <EmptyState analyzed={analyzedGames} />
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
            <span>Esempi:</span>
            {pattern.examples.map((ex, i) => (
              <Link
                key={`${ex.gameId}-${ex.ply}`}
                href={`/app/partite/${ex.gameId}`}
                className="font-mono underline-offset-2 hover:underline"
              >
                partita {i + 1} (mossa {Math.ceil(ex.ply / 2)})
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
      <span className="text-xs uppercase tracking-wide text-text-muted">Gravità</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-text" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function EmptyState({ analyzed }: { analyzed: number }) {
  return (
    <Card>
      <CardContent className="space-y-3 py-6 text-center">
        <p className="text-text-muted">
          Servono almeno {MIN_ANALYZED_GAMES} partite analizzate per individuare pattern
          affidabili. Ne hai {analyzed}.
        </p>
        <Link href="/app/partite">
          <Button>Importa e analizza partite</Button>
        </Link>
      </CardContent>
    </Card>
  );
}

function NoPatterns() {
  return (
    <Card>
      <CardContent className="py-6 text-center text-text-muted">
        Nessuna debolezza ricorrente evidente nelle partite recenti. Continua così —
        analizza altre partite per affinare il quadro.
      </CardContent>
    </Card>
  );
}
