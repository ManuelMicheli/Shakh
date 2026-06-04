import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
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
  const user = await getUser();
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
  const name = profile?.display_name ?? profile?.username ?? "Student";

  // Stesse aggregazioni dell'08, applicate all'allievo via RLS (sola lettura).
  const data = await loadDashboard(supabase, userId);

  return (
    <div className="space-y-8">
      <div>
        <Link href={`/app/gruppi/${id}/classe`} className="text-sm text-text-muted hover:text-text">
          ← Class dashboard
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <h1 className="font-display text-3xl font-semibold tracking-tight">{name}</h1>
          <Badge variant="muted">read-only</Badge>
        </div>
        <p className="mt-1 text-text-muted">
          Teaching context: the student&apos;s progress as they see it, read-only.
        </p>
      </div>

      {data.empty ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-text-muted">
            This student doesn&apos;t have enough data for the dashboard yet.
          </CardContent>
        </Card>
      ) : (
        <DashboardView data={data} readOnly />
      )}
    </div>
  );
}
