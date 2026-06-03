import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { NextStep } from "@/components/percorso/NextStep";
import { DashboardView } from "@/components/progress";
import { StudentAssignments } from "@/components/groups/StudentAssignments";
import { loadPathViews, loadWeakest } from "@/lib/path/read";
import { computeNextStep } from "@/lib/path/recommend";
import { loadDashboard } from "@/lib/progress/aggregate";
import { loadStudentAssignments } from "@/lib/groups/assignments";

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

  // Diagnostico non fatto: dashboard ridotta che invita all'onboarding.
  if (!profile?.onboarding_completed) {
    return (
      <div className="space-y-6">
        <Header name={name} />
        <NextStep step={null} />
      </div>
    );
  }

  const [nodes, weakest, data, assignments] = await Promise.all([
    loadPathViews(supabase, user!.id),
    loadWeakest(supabase, user!.id),
    loadDashboard(supabase, user!.id),
    loadStudentAssignments(supabase, user!.id),
  ]);
  const step = computeNextStep(profile.current_level ?? 0, nodes, weakest);

  // Utente nuovo, nessun dato: stato vuoto pulito (no grafici vuoti).
  if (data.empty) {
    return (
      <div className="space-y-6">
        <Header name={name} />
        <NextStep step={step} />
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
      <Header name={name} />
      {assignments.length > 0 && <StudentAssignments items={assignments} />}
      <DashboardView data={data} middleSlot={<NextStep step={step} />} />
    </div>
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
