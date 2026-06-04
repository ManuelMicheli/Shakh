import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient, getUser } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { loadWeaknesses, MIN_ANALYZED_GAMES, type WeaknessPattern } from "@/lib/weakness/engine";
import { AnalyzePendingButton } from "@/components/analysis/AnalyzePendingButton";
import { MobilePageHeader } from "@/components/layout/MobilePageHeader";
import { activeLocale } from "@/lib/i18n/content";

// Tipo del traduttore "study", riusato dai sotto-componenti sincroni.
type StudyT = Awaited<ReturnType<typeof getTranslations<"study">>>;

export async function generateMetadata() {
  const t = await getTranslations("study");
  return { title: t("weaknesses.metaTitle") };
}

export default async function DebolezzePage() {
  const supabase = await createClient();
  const t = await getTranslations("study");
  const user = await getUser();

  const { analyzedGames, patterns } = await loadWeaknesses(supabase, user!.id, await activeLocale());

  // Partite importate ma ancora da analizzare: alimentano la CTA di bootstrap.
  const { count: pendingCount } = await supabase
    .from("games")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user!.id)
    .eq("analyzed", false);
  const pendingGames = pendingCount ?? 0;

  return (
    <div className="space-y-8">
      <MobilePageHeader
        eyebrow={t("weaknesses.eyebrow")}
        title={t("weaknesses.title")}
        desc={t("weaknesses.desc")}
      />
      <div className="hidden md:block">
        <h1 className="font-display text-3xl font-semibold tracking-tight">{t("weaknesses.title")}</h1>
        <p className="mt-2 max-w-2xl text-text-muted">
          {t.rich("weaknesses.intro", { em: (chunks) => <em>{chunks}</em> })}
        </p>
      </div>

      {analyzedGames < MIN_ANALYZED_GAMES ? (
        <EmptyState analyzed={analyzedGames} pending={pendingGames} t={t} />
      ) : patterns.length === 0 ? (
        <NoPatterns t={t} />
      ) : (
        <div className="space-y-3">
          {patterns.map((p) => (
            <PatternCard key={p.id} pattern={p} t={t} />
          ))}
        </div>
      )}
    </div>
  );
}

function PatternCard({ pattern, t }: { pattern: WeaknessPattern; t: StudyT }) {
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
        <SeverityBar value={pattern.severity} t={t} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
            <span>{t("weaknesses.examples")}</span>
            {pattern.examples.map((ex, i) => (
              <Link
                key={`${ex.gameId}-${ex.ply}`}
                href={`/app/partite/${ex.gameId}`}
                className="font-mono underline-offset-2 hover:underline"
              >
                {t("weaknesses.example", { n: i + 1, move: Math.ceil(ex.ply / 2) })}
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
function SeverityBar({ value, t }: { value: number; t: StudyT }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs uppercase tracking-wide text-text-muted">{t("weaknesses.severity")}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-text" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function EmptyState({ analyzed, pending, t }: { analyzed: number; pending: number; t: StudyT }) {
  return (
    <Card>
      <CardContent className="space-y-3 py-6 text-center">
        <p className="text-text-muted">
          {t("weaknesses.empty.base", { min: MIN_ANALYZED_GAMES, analyzed })}
          {pending > 0
            ? t("weaknesses.empty.pendingSuffix", { pending })
            : "."}
        </p>
        {pending > 0 ? (
          <div className="flex flex-col items-center gap-2">
            <AnalyzePendingButton pending={pending} />
            <Link
              href="/app/partite"
              className="text-xs text-text-muted underline-offset-2 hover:underline"
            >
              {t("weaknesses.manageAll")}
            </Link>
          </div>
        ) : (
          <Link href="/app/partite">
            <Button>{t("weaknesses.importAnalyze")}</Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

function NoPatterns({ t }: { t: StudyT }) {
  return (
    <Card>
      <CardContent className="py-6 text-center text-text-muted">
        {t("weaknesses.noPatterns")}
      </CardContent>
    </Card>
  );
}
