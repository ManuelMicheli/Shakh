import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AssignmentForm, type AssignmentFormData } from "@/components/groups/AssignmentForm";
import { AssignmentMonitor, type MonitorItem } from "@/components/groups/AssignmentMonitor";
import { loadMembers } from "@/lib/groups/class";
import { loadGroupAssignments } from "@/lib/groups/assignments";
import { getMyGroupRole, isInstructorRole } from "@/lib/groups/access";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AssegnazioniPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await getUser();
  if (!user) redirect("/login");

  const role = await getMyGroupRole(supabase, id, user.id);
  if (!isInstructorRole(role)) notFound();

  const { data: group } = await supabase
    .from("groups")
    .select("name")
    .eq("id", id)
    .maybeSingle<{ name: string }>();
  if (!group) notFound();

  const members = await loadMembers(supabase, id);
  const allievi = members.filter((m) => m.role === "member");
  const memberIds = allievi.map((m) => m.userId);

  const [{ data: lessons }, { data: traps }, { data: reps }, { data: nodes }, monitor] =
    await Promise.all([
      supabase
        .from("content_items")
        .select("id, title")
        .eq("published", true)
        .order("level", { ascending: true }),
      supabase
        .from("traps")
        .select("id, name")
        .eq("published", true)
        .order("level", { ascending: true }),
      supabase
        .from("repertoires")
        .select("id, name")
        .eq("owner_group_id", id)
        .order("created_at", { ascending: true }),
      supabase
        .from("path_nodes")
        .select("id, title")
        .eq("published", true)
        .order("level", { ascending: true }),
      loadGroupAssignments(supabase, id, memberIds),
    ]);

  const formData: AssignmentFormData = {
    members: allievi.map((m) => ({ userId: m.userId, name: m.name })),
    lessons: (lessons as { id: string; title: string }[] | null) ?? [],
    traps: (traps as { id: string; name: string }[] | null) ?? [],
    repertoires: (reps as { id: string; name: string }[] | null) ?? [],
    pathNodes: (nodes as { id: string; title: string }[] | null) ?? [],
  };

  const monitorItems: MonitorItem[] = monitor.map((m) => ({
    id: m.id,
    label: m.label,
    typeLabel: m.typeLabel,
    targetType: m.targetType,
    note: m.note,
    dueAt: m.dueAt,
    total: m.total,
    completed: m.completed,
    inProgress: m.inProgress,
  }));

  return (
    <div className="space-y-8">
      <div>
        <Link href={`/app/gruppi/${id}`} className="text-sm text-text-muted hover:text-text">
          ← {group.name}
        </Link>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">Assegnazioni</h1>
        <p className="mt-1 text-text-muted">
          Assegna attività a un allievo o all&apos;intera classe. Il completamento è derivato
          dai progressi reali; dove non possibile, l&apos;allievo la segna fatta.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nuova assegnazione</CardTitle>
          <CardDescription>Lezione, puzzle, finale, trappola, repertorio o nodo.</CardDescription>
        </CardHeader>
        <CardContent>
          <AssignmentForm groupId={id} data={formData} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Monitoraggio</CardTitle>
          <CardDescription>Stato di completamento fra gli allievi.</CardDescription>
        </CardHeader>
        <CardContent>
          <AssignmentMonitor groupId={id} items={monitorItems} />
        </CardContent>
      </Card>
    </div>
  );
}
