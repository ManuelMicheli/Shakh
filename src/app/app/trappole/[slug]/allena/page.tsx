import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TrapTrainer } from "@/components/traps/TrapTrainer";
import { getTrapBySlug, bodyAsLesson } from "@/lib/traps/query";
import type { TrapMode } from "@/lib/traps/types";

export default async function TrapTrainPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const mode: TrapMode = sp.mode === "evita" ? "evita" : "tendi";

  const supabase = await createClient();
  const trap = await getTrapBySlug(supabase, slug);
  if (!trap) notFound();

  const lesson = bodyAsLesson(trap.body);
  if (!lesson) notFound();

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold tracking-tight">
        {mode === "tendi" ? "Tendi" : "Evita"} · {trap.name}
      </h1>

      <p className="text-text-muted">
        {mode === "tendi"
          ? "L'avversario gioca l'esca: trova la punizione (il sacrificio o la tattica)."
          : "Sei dalla parte di chi rischia: trova la mossa sicura che non abbocca."}
      </p>

      <TrapTrainer
        trapId={trap.id}
        slug={trap.slug}
        name={trap.name}
        side={trap.side}
        triggerFen={trap.trigger_fen}
        tree={lesson.tree}
        mode={mode}
      />
    </div>
  );
}
