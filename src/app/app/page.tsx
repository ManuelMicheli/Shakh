import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { NextStep } from "@/components/percorso/NextStep";
import { DashboardView } from "@/components/progress";
import { MobileDashboardHero } from "@/components/progress/MobileDashboardHero";
import { StudentAssignments } from "@/components/groups/StudentAssignments";
import { AnalyzePendingButton } from "@/components/analysis/AnalyzePendingButton";
import { loadPathViews, loadWeakest } from "@/lib/path/read";
import { computeNextStep } from "@/lib/path/recommend";
import { loadDashboard } from "@/lib/progress/aggregate";
import { loadStudentAssignments } from "@/lib/groups/assignments";
import { MIN_ANALYZED_GAMES } from "@/lib/weakness/engine";

const PRIMARY_LINK =
  "inline-flex h-9 items-center rounded-md bg-text px-4 text-sm font-medium text-bg hover:opacity-90";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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

  const name = profile?.display_name ?? profile?.username ?? "giocatore";

  // Primo accesso: il diagnostico non è ancora stato fatto. Porta l'utente nel
  // flusso di benvenuto (presentazione + collegamento account + mini-test).
  if (!profile?.onboarding_completed) redirect("/app/onboarding");

  const [nodes, weakest, data, assignments, pendingRes] = await Promise.all([
    loadPathViews(supabase, user!.id),
    loadWeakest(supabase, user!.id),
    loadDashboard(supabase, user!.id),
    loadStudentAssignments(supabase, user!.id),
    supabase
      .from("games")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user!.id)
      .eq("analyzed", false),
  ]);
  const step = computeNextStep(profile.current_level ?? 0, nodes, weakest);

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
        <div className="hidden md:block">
          <Header name={name} />
        </div>
        {showNudge && <PendingAnalysisNudge pending={pendingGames} />}
        <div className="hidden md:block">
          <NextStep step={step} />
        </div>
        {assignments.length > 0 && <StudentAssignments items={assignments} />}
        <Card>
          <CardHeader>
            <CardTitle>Inizia a raccogliere dati</CardTitle>
            <CardDescription>
              Risolvi qualche puzzle o importa una partita: la dashboard si
              popolerà di progressi, grafici e consigli su misura.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Link href="/app/tattiche" className={PRIMARY_LINK}>
              Allenati sui puzzle
            </Link>
            <Link
              href="/app/partite"
              className="inline-flex h-9 items-center rounded-md border border-border px-4 text-sm font-medium text-text hover:bg-surface-2"
            >
              Importa una partita
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
      <div className="hidden md:block">
        <Header name={name} />
      </div>
      {showNudge && <PendingAnalysisNudge pending={pendingGames} />}
      {assignments.length > 0 && <StudentAssignments items={assignments} />}
      <DashboardView
        data={data}
        middleSlot={<NextStep step={step} />}
        heroOnMobile
      />
    </div>
  );
}

/** Banner: invita ad analizzare le partite importate per popolare la diagnostica. */
function PendingAnalysisNudge({ pending }: { pending: number }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Analizza le partite importate</CardTitle>
        <CardDescription>
          Hai {pending}{" "}
          {pending === 1 ? "partita importata" : "partite importate"} ancora da
          analizzare. Analizzale per sbloccare punti deboli, accuratezza e i
          consigli del coach.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AnalyzePendingButton pending={pending} />
      </CardContent>
    </Card>
  );
}

function Header({ name }: { name: string }) {
  return (
    <div>
      <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Ciao, {name}</h1>
      <p className="mt-2 text-text-muted">Il quadro dei tuoi progressi.</p>
    </div>
  );
}
