"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { refreshProgressAndSynthesize } from "@/app/app/coach/actions";
import type { CoachSynthesis } from "@/lib/ai/types";

/**
 * Funzione C (UI) — bottone che aggiorna i progressi e chiede al coach la
 * sintesi dei pattern d'errore. La sintesi non è auto-generata (controllo costi).
 */
export function PatternSynthesis({
  coachConfigured,
  hasData,
}: {
  coachConfigured: boolean;
  hasData: boolean;
}) {
  const { toast } = useToast();
  const [pending, start] = useTransition();
  const [synthesis, setSynthesis] = useState<CoachSynthesis | null>(null);

  const onGenerate = () => {
    start(async () => {
      const res = await refreshProgressAndSynthesize();
      if (!res.ok) {
        toast({ title: "Summary unavailable", description: res.error, variant: "error" });
        return;
      }
      setSynthesis(res.synthesis ?? null);
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button onClick={onGenerate} disabled={pending || !coachConfigured || !hasData}>
          {pending ? "…" : synthesis ? "Regenerate summary" : "Generate coach summary"}
        </Button>
        {pending && (
          <span className="flex items-center gap-2 text-sm text-text-muted">
            <Spinner /> The coach is analyzing your patterns…
          </span>
        )}
      </div>

      {!coachConfigured && (
        <p className="text-sm text-text-muted">
          The AI coach isn&apos;t configured (<code className="font-mono">ANTHROPIC_API_KEY</code> is missing).
          The metrics above remain available.
        </p>
      )}

      {synthesis && (
        <div className="space-y-4 rounded-md border border-border bg-surface-2 p-4">
          <p className="text-sm leading-relaxed">{synthesis.summary}</p>
          {synthesis.focusAreas.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {synthesis.focusAreas.map((a) => (
                <Badge key={a}>{a}</Badge>
              ))}
            </div>
          )}
          {synthesis.suggestion && (
            <p className="text-sm text-text-muted">
              <span className="font-medium text-text">Tip: </span>
              {synthesis.suggestion}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
