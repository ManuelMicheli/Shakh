import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Users, ClipboardList } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MemberList } from "@/components/groups/MemberList";
import { InviteManager } from "@/components/groups/InviteManager";
import { GroupRepertoireForm } from "@/components/groups/GroupRepertoireForm";
import { loadMembers } from "@/lib/groups/class";
import { getMyGroupRole, isInstructorRole } from "@/lib/groups/access";
import {
  GROUP_TYPE_LABEL,
  type GroupRole,
  type GroupType,
  type InviteRow,
  type MemberRow,
} from "@/lib/groups/types";

interface PageProps {
  params: Promise<{ id: string }>;
}

interface InviteRecord {
  id: string;
  code: string;
  email: string | null;
  role_in_group: GroupRole;
  expires_at: string | null;
  used_by: string | null;
  used_at: string | null;
  created_at: string;
}

interface GroupRepRow {
  id: string;
  name: string;
  color: string;
  repertoire_moves: { count: number }[];
}

export default async function GroupPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: group } = await supabase
    .from("groups")
    .select("id, name, type")
    .eq("id", id)
    .maybeSingle<{ id: string; name: string; type: GroupType }>();
  if (!group) notFound();

  const role = await getMyGroupRole(supabase, id, user.id);
  if (!role) notFound(); // non sei membro → la RLS comunque non mostrerebbe i dati
  const instructor = isInstructorRole(role);
  const isOwner = role === "owner";

  const membersRaw = await loadMembers(supabase, id);
  const members: MemberRow[] = membersRaw.map((m) => ({
    userId: m.userId,
    displayName: m.name,
    username: m.username,
    role: m.role,
    joinedAt: "",
  }));

  // Inviti e repertori di gruppo solo per istruttori.
  let invites: InviteRow[] = [];
  let groupReps: GroupRepRow[] = [];
  if (instructor) {
    const [{ data: inv }, { data: reps }] = await Promise.all([
      supabase
        .from("group_invites")
        .select("id, code, email, role_in_group, expires_at, used_by, used_at, created_at")
        .eq("group_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("repertoires")
        .select("id, name, color, repertoire_moves(count)")
        .eq("owner_group_id", id)
        .order("created_at", { ascending: true }),
    ]);
    invites = ((inv as InviteRecord[] | null) ?? []).map((r) => ({
      id: r.id,
      code: r.code,
      email: r.email,
      roleInGroup: r.role_in_group,
      expiresAt: r.expires_at,
      usedBy: r.used_by,
      usedAt: r.used_at,
      createdAt: r.created_at,
    }));
    groupReps = (reps as GroupRepRow[] | null) ?? [];
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <Link href="/app/gruppi" className="text-sm text-text-muted hover:text-text">
          ← Tutti i gruppi
        </Link>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">{group.name}</h1>
        <p className="mt-1 text-text-muted">
          {GROUP_TYPE_LABEL[group.type]} · {members.length} membri
        </p>
      </div>

      {instructor && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Link href={`/app/gruppi/${id}/classe`}>
            <Card className="transition-colors hover:bg-surface-2">
              <CardContent className="flex items-center gap-3 py-4">
                <Users className="h-5 w-5" aria-hidden />
                <div>
                  <p className="font-medium">Dashboard di classe</p>
                  <p className="text-xs text-text-muted">Progressi aggregati degli allievi</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href={`/app/gruppi/${id}/assegnazioni`}>
            <Card className="transition-colors hover:bg-surface-2">
              <CardContent className="flex items-center gap-3 py-4">
                <ClipboardList className="h-5 w-5" aria-hidden />
                <div>
                  <p className="font-medium">Assegnazioni</p>
                  <p className="text-xs text-text-muted">Crea e monitora le attività</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Membri</CardTitle>
          <CardDescription>
            {isOwner
              ? "Promuovi a istruttore, rimuovi o apri i progressi di un allievo."
              : instructor
                ? "Apri i progressi di un allievo."
                : "Le persone in questo gruppo."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MemberList groupId={id} members={members} isOwner={isOwner} canDrill={instructor} />
        </CardContent>
      </Card>

      {instructor && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Inviti</CardTitle>
              <CardDescription>
                Genera un codice/link con ruolo e scadenza. Ogni invito vale per un ingresso.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InviteManager groupId={id} invites={invites} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Repertori di gruppo</CardTitle>
              <CardDescription>
                «Nel nostro circolo giochiamo così». Gli allievi li allenano con il trainer.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <GroupRepertoireForm groupId={id} />
              {groupReps.length > 0 && (
                <ul className="divide-y divide-border">
                  {groupReps.map((r) => (
                    <li
                      key={r.id}
                      className="flex flex-wrap items-center justify-between gap-3 py-2.5"
                    >
                      <div>
                        <p className="font-medium">{r.name}</p>
                        <p className="text-xs text-text-muted">
                          {r.color === "white" ? "Bianco" : "Nero"} ·{" "}
                          {r.repertoire_moves?.[0]?.count ?? 0} mosse
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/app/repertorio/${r.id}`}
                          className="inline-flex h-8 items-center rounded-md border border-border bg-surface-2 px-3 text-sm font-medium text-text hover:bg-surface"
                        >
                          Editor
                        </Link>
                        <Link
                          href={`/app/repertorio/${r.id}/training`}
                          className="inline-flex h-8 items-center rounded-md border border-border bg-surface-2 px-3 text-sm font-medium text-text hover:bg-surface"
                        >
                          Allena
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
