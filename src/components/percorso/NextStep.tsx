import Link from "next/link";
import { Compass, Route } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { NextStep as NextStepData } from "@/lib/path/recommend";

const PRIMARY_LINK =
  "inline-flex h-8 items-center rounded-md bg-text px-3 text-sm font-medium text-bg hover:opacity-90";
const GHOST_LINK =
  "inline-flex h-8 items-center rounded-md px-3 text-sm font-medium text-text hover:bg-surface-2";

export interface NextStepProps {
  step: NextStepData | null;
  /** Compatto per la home; esteso nella pagina percorso. */
  compact?: boolean;
}

/**
 * Widget "prossimo passo". In modalità `guided` indica il prossimo nodo del
 * curriculum; in `autonomous` propone un allenamento mirato sui dati e mette in
 * evidenza la modalità libera (il percorso resta riferimento, non gabbia).
 */
export function NextStep({ step, compact = false }: NextStepProps) {
  const t = useTranslations("study");
  if (!step) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("nextStep.title")}</CardTitle>
          <CardDescription>
            {t("nextStep.completeDiagnostic")}
          </CardDescription>
        </CardHeader>
        {!compact && (
          <CardContent>
            <Link href="/app/onboarding" className={PRIMARY_LINK}>
              {t("nextStep.startDiagnostic")}
            </Link>
          </CardContent>
        )}
      </Card>
    );
  }

  const autonomous = step.mode === "autonomous";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>{t("nextStep.title")}</CardTitle>
          <Badge variant={autonomous ? "outline" : "muted"}>
            {autonomous ? (
              <span className="flex items-center gap-1">
                <Compass className="h-3 w-3" /> {t("nextStep.freeMode")}
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Route className="h-3 w-3" /> {t("nextStep.pathBadge")}
              </span>
            )}
          </Badge>
        </div>
        <CardDescription className="font-medium text-text">{step.title}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-text-muted">{step.reason}</p>
        <div className="flex flex-wrap items-center gap-2">
          {step.activity && (
            <Link href={step.activity.href} className={PRIMARY_LINK}>
              {step.activity.label}
            </Link>
          )}
          {autonomous && (
            <Link href="/app/percorso" className={GHOST_LINK}>
              {t("nextStep.viewPath")}
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
