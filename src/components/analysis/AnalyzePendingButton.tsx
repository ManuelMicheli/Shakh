"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useAnalysisJob, MAX_BATCH_JOBS } from "@/components/analysis/AnalysisJobContext";
import { getPendingAnalysisJobs } from "@/app/app/partite/actions";

/**
 * CTA per la pagina Punti deboli: accoda l'analisi delle partite importate ma
 * non ancora analizzate, così la diagnostica si sblocca senza passare dalla lista
 * partite. Analizza fino a {@link MAX_BATCH_JOBS} alla volta nel pool di worker.
 */
export function AnalyzePendingButton({ pending }: { pending: number }) {
  const t = useTranslations("games");
  const { startBatch, job } = useAnalysisJob();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const running = job?.status === "running";
  const count = Math.min(pending, MAX_BATCH_JOBS);

  const onClick = async () => {
    setLoading(true);
    try {
      const jobs = await getPendingAnalysisJobs(MAX_BATCH_JOBS);
      if (jobs.length === 0) {
        toast({ title: t("noGamesToAnalyze") });
        return;
      }
      const n = startBatch(jobs);
      toast({
        title: n > 1 ? t("gamesQueued", { n }) : t("analysisStarted"),
        description: t("analyzedOneAtATime"),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={onClick} disabled={loading || running || pending === 0}>
      {running
        ? t("analyzing")
        : loading
          ? t("startingShort")
          : t("analyzeNGames", { count })}
    </Button>
  );
}
