import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buildDailyPlan, type PlanBlock } from "@/lib/daily/plan";
import { cn } from "@/lib/utils";

export const metadata = { title: "Allenamento di oggi — Shakh" };

export default async function OggiPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const plan = await buildDailyPlan(supabase, user!.id);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            Allenamento di oggi
          </h1>
          <p className="mt-2 max-w-2xl text-text-muted">
            Una sessione breve e mirata, costruita dai tuoi dati: ripasso, punti deboli,
            tattica e finali. Siediti e allenati.
          </p>
        </div>
        <div className="text-right">
          <div className="font-mono text-2xl tabular-nums">~{plan.totalMin}′</div>
          <div className="text-xs uppercase tracking-wide text-text-muted">durata stimata</div>
        </div>
      </div>

      {plan.completed && (
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <Badge>fatto</Badge>
            <p className="text-sm">
              Sessione di oggi completata. Ottimo lavoro — torna domani per il prossimo piano.
            </p>
          </CardContent>
        </Card>
      )}

      <ol className="space-y-3">
        {plan.blocks.map((b, i) => (
          <BlockRow key={b.kind} block={b} index={i + 1} />
        ))}
      </ol>
    </div>
  );
}

function BlockRow({ block, index }: { block: PlanBlock; index: number }) {
  const done = block.done >= block.target;
  const pct = block.target > 0 ? Math.min(100, Math.round((block.done / block.target) * 100)) : 0;

  return (
    <li>
      <Link href={block.href} className="group block">
        <Card className={cn("transition-colors group-hover:border-text", done && "opacity-70")}>
          <CardContent className="flex items-center gap-4 py-4">
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border font-mono text-sm",
                done ? "border-text bg-text text-bg" : "border-border text-text-muted",
              )}
            >
              {done ? "✓" : index}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate font-medium">{block.title}</p>
                <span className="shrink-0 font-mono text-xs text-text-muted">
                  {block.done}/{block.target}
                </span>
              </div>
              <p className="mt-0.5 truncate text-sm text-text-muted">{block.detail}</p>
              <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-surface-2">
                <div className="h-full rounded-full bg-text transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>

            <span className="shrink-0 font-mono text-xs text-text-muted">~{block.estMin}′</span>
          </CardContent>
        </Card>
      </Link>
    </li>
  );
}
