import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient, getUser } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DashboardView } from "@/components/progress";
import { DesktopDashboard } from "@/components/progress/DesktopDashboard";
import { MobileDashboardHero } from "@/components/progress/MobileDashboardHero";
import { StudentAssignments } from "@/components/groups/StudentAssignments";
import { AnalyzePendingButton } from "@/components/analysis/AnalyzePendingButton";
import { loadPathViews, loadWeakest } from "@/lib/path/read";
import { computeNextStep } from "@/lib/path/recommend";
import { loadDashboard } from "@/lib/progress/aggregate";
import { loadStudentAssignments } from "@/lib/groups/assignments";
import { MIN_ANALYZED_GAMES } from "@/lib/weakness/engine";
import { activeLocale } from "@/lib/i18n/content";

const PRIMARY_LINK =
  "inline-flex h-9 items-center rounded-md bg-text px-4 text-sm font-medium text-bg hover:opacity-90";

export default async function DashboardPage() {
  const supabase = await createClient();
  const user = await getUser();
  const t = await getTranslations("dashboard");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, username, current_level, onboarding_completed")
    .eq("id", user!.id)
    .maybeSingle<{
      display_name: string | null;
      username: string | null;
      current_level: number;
      onboarding_completed: boolean;
    }>();

  const name = profile?.display_name ?? profile?.username ?? t("defaultPlayerName");

  // Primo accesso: il diagnostico non è ancora stato fatto. Porta l'utente nel
  // flusso di benvenuto (presentazione + collegamento account + mini-test).
  if (!profile?.onboarding_completed) redirect("/app/onboarding");

  const locale = await activeLocale();
  const [nodes, weakest, data, assignments, pendingRes] = await Promise.all([
    loadPathViews(supabase, user!.id),
    loadWeakest(supabase, user!.id),
    loadDashboard(supabase, user!.id, locale),
    loadStudentAssignments(supabase, user!.id, locale),
    supabase
      .from("games")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user!.id)
      .eq("analyzed", false),
  ]);
  const step = computeNextStep(profile.current_level ?? 0, nodes, weakest, locale);

  // Partite importate ma non ancora analizzate: nudge a sbloccare la diagnostica,
  // ma solo finché i dati analizzati sono sotto la soglia utile.
  const pendingGames = pendingRes.count ?? 0;
  const showNudge = pendingGames > 0 && data.game.analyzed < MIN_ANALYZED_GAMES;

  // Utente nuovo, nessun dato: stato vuoto pulito (no grafici vuoti).
  if (data.empty) {
    return (
      <div className="space-y-6">
        <MobileDashboardHero
          name={name}
          rating={data.shakhRating ?? null}
          step={step}
        />
        <DesktopDashboard name={name} data={data} step={step} />
        {showNudge && <PendingAnalysisNudge pending={pendingGames} />}
        {assignments.length > 0 && <StudentAssignments items={assignments} />}
        <Card>
          <CardHeader>
            <CardTitle>{t("empty.title")}</CardTitle>
            <CardDescription>{t("empty.desc")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Link href="/app/tattiche" className={PRIMARY_LINK}>
              {t("empty.trainPuzzles")}
            </Link>
            <Link
              href="/app/partite"
              className="inline-flex h-9 items-center rounded-md border border-border px-4 text-sm font-medium text-text hover:bg-surface-2"
            >
              {t("empty.importGame")}
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <MobileDashboardHero
        name={name}
        rating={data.shakhRating ?? null}
        step={step}
      />
      <DesktopDashboard name={name} data={data} step={step} />
      {showNudge && <PendingAnalysisNudge pending={pendingGames} />}
      {assignments.length > 0 && <StudentAssignments items={assignments} />}
      {/* Hero/testata (saluto, rating, prossimo passo) resi sopra: su desktop dalla
          Broadsheet, su telefono dalla MobileDashboardHero. Qui restano solo le
          sezioni analitiche, perciò la sintesi in alto è soppressa ovunque. */}
      <DashboardView data={data} heroOnMobile suppressTop />
    </div>
  );
}

/** Banner: invita ad analizzare le partite importate per popolare la diagnostica. */
async function PendingAnalysisNudge({ pending }: { pending: number }) {
  const t = await getTranslations("dashboard");
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("nudge.title")}</CardTitle>
        <CardDescription>{t("nudge.desc", { count: pending })}</CardDescription>
      </CardHeader>
      <CardContent>
        <AnalyzePendingButton pending={pending} />
      </CardContent>
    </Card>
  );
}
