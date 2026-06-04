"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { refreshClassSynthesis } from "@/app/app/gruppi/actions";
import type { CoachSynthesis } from "@/lib/ai/types";

/** Riassunto di classe via coach (prompt 09 §7): on-demand, non persistito. */
export function ClassSynthesis({ groupId }: { groupId: string }) {
  const t = useTranslations("groups");
  const { toast } = useToast();
  const [synth, setSynth] = useState<CoachSynthesis | null>(null);
  const [pending, start] = useTransition();

  const onRun = () => {
    start(async () => {
      const res = await refreshClassSynthesis(groupId);
      if (!res.ok || !res.data) {
        toast({ title: t("toastSummaryFailed"), description: res.error, variant: "error" });
        return;
      }
      setSynth(res.data.synthesis);
    });
  };

  return (
    <div className="space-y-3">
      {synth ? (
        <div className="space-y-3">
          <p className="text-sm leading-relaxed">{synth.summary}</p>
          {synth.focusAreas.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {synth.focusAreas.map((a) => (
                <Badge key={a}>{a}</Badge>
              ))}
            </div>
          )}
          {synth.suggestion && (
            <p className="text-sm text-text-muted">
              <span className="font-medium text-text">{t("synthesisSuggestionLabel")} </span>
              {synth.suggestion}
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-text-muted">
          {t("synthesisPlaceholder")}
        </p>
      )}
      <Button variant="secondary" size="sm" onClick={onRun} disabled={pending}>
        {pending
          ? t("generatingPending")
          : synth
            ? t("regenerateSummaryButton")
            : t("generateClassSummaryButton")}
      </Button>
    </div>
  );
}
