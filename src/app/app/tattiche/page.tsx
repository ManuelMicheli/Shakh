import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TacticsTrainer } from "@/components/tactics/TacticsTrainer";
import { ensureStats, selectNextPuzzle, dueReviewCount } from "@/lib/tactics/query";
import { TACTIC_THEMES, themeLabel } from "@/lib/tactics/themes";
import type { TacticMode, TacticStats } from "@/lib/tactics/types";

export const metadata = { title: "Tattiche — Shakh" };

const MODES: { mode: TacticMode; title: string; desc: string }[] = [
  { mode: "adaptive", title: "Adattivo", desc: "Flusso continuo di puzzle al tuo livello. Aggiorna rating e serie." },
  { mode: "theme", title: "Per tema", desc: "Allena un motivo specifico: forchetta, inchiodatura, finali…" },
  { mode: "review", title: "Ripasso", desc: "Rivedi i puzzle sbagliati in scadenza (ripetizione spaziata)." },
  { mode: "timed", title: "Sfida a tempo", desc: "3 minuti, difficoltà crescente: quanti ne risolvi?" },
];

const VALID_MODES: TacticMode[] = ["adaptive", "theme", "review", "timed"];

export default async function TattichePage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; theme?: string }>;
}) {
  const sp = await searchParams;
  const mode = VALID_MODES.includes(sp.mode as TacticMode) ? (sp.mode as TacticMode) : null;
  const theme = typeof sp.theme === "string" && sp.theme ? sp.theme : null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const stats = await ensureStats(supabase, user!.id);

  // Modalità attiva → trainer (per "Per tema" serve un tema scelto).
  if (mode && (mode !== "theme" || theme)) {
    const puzzle = await selectNextPuzzle(supabase, user!.id, {
      mode,
      theme,
      targetRating: mode === "timed" ? stats.rating : undefined,
    });
    return (
      <TacticsTrainer mode={mode} theme={theme} initialPuzzle={puzzle} initialStats={stats} />
    );
  }

  // "Per tema" senza tema → scelta del tema.
  if (mode === "theme") {
    return <ThemePicker />;
  }

  const reviewCount = await dueReviewCount(supabase, user!.id);
  return <Hub stats={stats} reviewCount={reviewCount} />;
}

function Hub({ stats, reviewCount }: { stats: TacticStats; reviewCount: number }) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Tattiche</h1>
        <p className="mt-2 text-text-muted">
          Allena la visione tattica con i puzzle. Il rating si adatta a te e i puzzle
          sbagliati tornano da rivedere.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Rating tattico" value={stats.rating} />
        <Stat label="Serie attuale" value={stats.currentStreak} />
        <Stat label="Miglior serie" value={stats.bestStreak} />
        <Stat label="Risolti" value={stats.puzzlesSolved} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {MODES.map((m) => (
          <Link key={m.mode} href={`/app/tattiche?mode=${m.mode}`} className="group">
            <Card className="h-full transition-colors group-hover:border-text">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{m.title}</CardTitle>
                  {m.mode === "review" && reviewCount > 0 && (
                    <Badge>{reviewCount} in scadenza</Badge>
                  )}
                </div>
                <CardDescription>{m.desc}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

function ThemePicker() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Per tema — scegli un motivo
        </h1>
        <Link href="/app/tattiche" className="text-sm text-text-muted hover:text-text">
          ← Tattiche
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {TACTIC_THEMES.map((t) => (
          <Link key={t.key} href={`/app/tattiche?mode=theme&theme=${t.key}`}>
            <Card className="transition-colors hover:border-text">
              <CardContent className="py-4 text-center font-medium">{themeLabel(t.key)}</CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="text-xs uppercase tracking-wide text-text-muted">{label}</div>
      <div className="mt-1 font-mono text-2xl">{value}</div>
    </div>
  );
}
