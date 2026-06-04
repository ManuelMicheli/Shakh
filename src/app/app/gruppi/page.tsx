import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateGroupForm } from "@/components/groups/CreateGroupForm";
import { JoinForm } from "@/components/groups/JoinForm";
import {
  GROUP_TYPE_LABEL,
  GROUP_ROLE_LABEL,
  type GroupRole,
  type GroupType,
  type GroupSummary,
} from "@/lib/groups/types";
import { isInstructorRole } from "@/lib/groups/access";
import { MobilePageHeader } from "@/components/layout/MobilePageHeader";

export const metadata = { title: "Gruppi — Shakh" };

interface MembershipRow {
  role_in_group: GroupRole;
  group: { id: string; name: string; slug: string; type: GroupType } | null;
}

export default async function GruppiPage() {
  const supabase = await createClient();
  const user = await getUser();
  if (!user) redirect("/login");

  const { data: memberships } = await supabase
    .from("group_members")
    .select("role_in_group, group:groups(id, name, slug, type)")
    .eq("user_id", user.id);

  const rows = (memberships as MembershipRow[] | null) ?? [];
  const ids = rows.map((r) => r.group?.id).filter((x): x is string => Boolean(x));

  // Conteggio membri per ciascun gruppo (una sola query, tally lato server).
  const counts = new Map<string, number>();
  if (ids.length > 0) {
    const { data: all } = await supabase
      .from("group_members")
      .select("group_id")
      .in("group_id", ids);
    for (const m of (all as { group_id: string }[] | null) ?? []) {
      counts.set(m.group_id, (counts.get(m.group_id) ?? 0) + 1);
    }
  }

  const groups: GroupSummary[] = rows
    .filter((r) => r.group)
    .map((r) => ({
      id: r.group!.id,
      name: r.group!.name,
      slug: r.group!.slug,
      type: r.group!.type,
      role: r.role_in_group,
      memberCount: counts.get(r.group!.id) ?? 1,
    }));

  return (
    <div className="space-y-8">
      <MobilePageHeader
        eyebrow="Circoli e classi"
        title="Gruppi"
        desc="Segui gli allievi e assegna attività, o unisciti con un codice."
      />
      <div className="hidden md:block">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Circoli e gruppi</h1>
        <p className="mt-2 max-w-2xl text-text-muted">
          Crea un circolo o una classe per seguire i progressi dei tuoi allievi e
          assegnare attività, oppure unisciti a un gruppo con un codice d&apos;invito.
        </p>
      </div>

      {groups.length === 0 ? (
        <p className="text-sm text-text-muted">
          Non fai ancora parte di alcun gruppo. Creane uno o unisciti con un codice.
        </p>
      ) : (
        <ul className="space-y-2">
          {groups.map((g) => (
            <li key={g.id}>
              <Link href={`/app/gruppi/${g.id}`}>
                <Card className="transition-colors hover:bg-surface-2">
                  <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{g.name}</p>
                        {isInstructorRole(g.role) && (
                          <Badge variant="muted">{GROUP_ROLE_LABEL[g.role]}</Badge>
                        )}
                      </div>
                      <p className="text-xs text-text-muted">
                        {GROUP_TYPE_LABEL[g.type]} · {g.memberCount} membri
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Crea un gruppo</CardTitle>
          <CardDescription>Diventi istruttore del gruppo che crei.</CardDescription>
        </CardHeader>
        <CardContent>
          <CreateGroupForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Unisciti con un codice</CardTitle>
          <CardDescription>Hai ricevuto un invito? Incolla qui il codice.</CardDescription>
        </CardHeader>
        <CardContent>
          <JoinForm />
        </CardContent>
      </Card>
    </div>
  );
}
