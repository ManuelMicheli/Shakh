import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LessonViewer } from "@/components/theory/LessonViewer";
import { PositionChat } from "@/components/coach/PositionChat";
import { TrapFrequency } from "@/components/traps/TrapFrequency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getTrapBySlug, bodyAsLesson } from "@/lib/traps/query";
import { lureSan, triggerTurn } from "@/lib/traps/derive";
import {
  CATEGORY_LABEL,
  FAME_LABEL,
  SIDE_LABEL,
  motifLabel,
  motifTacticTheme,
} from "@/lib/traps/types";
import { markTrapSeen } from "@/app/app/trappole/actions";

export default async function TrapViewerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const trap = await getTrapBySlug(supabase, slug);
  if (!trap) notFound();

  const lesson = bodyAsLesson(trap.body);
  if (!lesson) {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center">
        <h1 className="font-display text-2xl font-semibold">{trap.name}</h1>
        <p className="mt-2 text-text-muted">This trap isn&apos;t available yet.</p>
      </div>
    );
  }

  // Primo accesso: segna come vista (non tocca l'SRS).
  await markTrapSeen(trap.id);

  const lure = lureSan(lesson.tree);
  const turn = triggerTurn(trap.trigger_fen);
  const coachConfigured = Boolean(process.env.ANTHROPIC_API_KEY);

  return (
    <div className="space-y-8">
      {/* Metadati */}
      <div className="space-y-3">
        <Link href="/app/trappole" className="text-sm text-text-muted hover:text-text">
          ← All traps
        </Link>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge>{CATEGORY_LABEL[trap.category]}</Badge>
          <Badge variant="muted">Set by {SIDE_LABEL[trap.side]}</Badge>
          <Badge variant="muted">{FAME_LABEL[trap.fame]}</Badge>
          {(trap.eco_code || trap.opening_name) && (
            <span className="font-mono text-xs text-text-muted">
              {trap.eco_code ? `${trap.eco_code} · ` : ""}
              {trap.opening_name ?? ""}
            </span>
          )}
        </div>
        {trap.motif.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs uppercase tracking-wide text-text-muted">Motifs:</span>
            {trap.motif.map((m) => {
              const theme = motifTacticTheme(m);
              return theme ? (
                <Link key={m} href={`/app/tattiche?mode=theme&theme=${theme}`}>
                  <Badge variant="muted" className="hover:border-text">
                    {motifLabel(m)} →
                  </Badge>
                </Link>
              ) : (
                <Badge key={m} variant="muted">
                  {motifLabel(m)}
                </Badge>
              );
            })}
          </div>
        )}
      </div>

      {/* Viewer narrativo (esca → scatto → seguito) riusando il LessonViewer */}
      <LessonViewer
        lesson={lesson}
        type="opening"
        title={trap.name}
        coachConfigured={coachConfigured}
      />

      {/* Allenamento */}
      <div className="grid gap-4 sm:grid-cols-2">
        <TrainLink
          href={`/app/trappole/${trap.slug}/allena?mode=tendi`}
          title="Set the trap"
          desc="The opponent plays the lure: find the punishment yourself."
        />
        <TrainLink
          href={`/app/trappole/${trap.slug}/allena?mode=evita`}
          title="Avoid the trap"
          desc="You're the one at risk: find the safe move."
        />
      </div>

      {/* Frequenza reale + coach */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>How often it really springs</CardTitle>
          </CardHeader>
          <CardContent>
            <TrapFrequency triggerFen={trap.trigger_fen} lureSan={lure} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ask the coach</CardTitle>
          </CardHeader>
          <CardContent>
            {coachConfigured ? (
              <PositionChat fen={trap.trigger_fen} turn={turn} />
            ) : (
              <p className="text-sm text-text-muted">
                Coach not configured. Set <span className="font-mono">ANTHROPIC_API_KEY</span>{" "}
                to ask, for example, &quot;why can&apos;t I just take the piece?&quot;.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function TrainLink({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link href={href} className="group">
      <Card className="h-full transition-colors group-hover:border-text">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-text-muted">{desc}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
