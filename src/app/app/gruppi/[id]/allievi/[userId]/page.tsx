import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DashboardView } from "@/components/progress";
import { loadDashboard } from "@/lib/progress/aggregate";
import { getMyGroupRole, isInstructorRole } from "@/lib/groups/access";

interface PageProps {
  params: Promise<{ id: string; userId: string }>;
}

export default async function StudentDrilldownPage({ params }: PageProps) {
  const { id, userId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Devo essere istruttore/owner del gruppo.
  const role = await getMyGroupRole(supabase, id, user.id);
  if (!isInstructorRole(role)) notFound();

  // L'allievo deve essere membro di QUESTO gruppo.
  const { data: membership } = await supabase
    .from("group_members")
    .select("user_id")
    .eq("group_id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (!membership) notFound();

  // Profilo dell'allievo (RLS: l'istruttore legge i profili dei propri membri).
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, username")
    .eq("id", userId)
    .maybeSingle<{ display_name: string | null; username: string | null }>();
  const name = profile?.display_name ?? profile?.username ?? "Allievo";

  // Stesse aggregazioni dell'08, applicate all'allievo via RLS (sola lettura).
  const data = await loadDashboard(supabase, userId);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <Link href={`/app/gruppi/${id}/classe`} className="text-sm text-text-muted hover:text-text">
          ← Dashboard di classe
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <h1 className="font-display text-3xl font-semibold tracking-tight">{name}</h1>
          <Badge variant="muted">sola lettura</Badge>
        </div>
        <p className="mt-1 text-text-muted">
          Contesto didattico: i progressi dell&apos;allievo come li vede lui, in sola lettura.
        </p>
      </div>

      {data.empty ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-text-muted">
            L&apos;allievo non ha ancora dati sufficienti per la dashboard.
          </CardContent>
        </Card>
      ) : (
        <DashboardView data={data} readOnly />
      )}
    </div>
  );
}
