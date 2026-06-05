import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Users, Plus, KeyRound } from "lucide-react";
import { createClient, getUser } from "@/lib/supabase/server";
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
import { cn } from "@/lib/utils";

export async function generateMetadata() {
  const t = await getTranslations("groups");
  return { title: t("metaTitle") };
}

interface MembershipRow {
  role_in_group: GroupRole;
  group: { id: string; name: string; slug: string; type: GroupType } | null;
}

export default async function GruppiPage() {
  const t = await getTranslations("groups");
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
      {/* Mobile — invariato */}
      <MobilePageHeader
        eyebrow={t("indexEyebrow")}
        title={t("indexTitle")}
        desc={t("indexDesc")}
      />

      {/* ---------------------------------------------------------------- */}
      {/* Mobile: lista compatta + form in colonna (presentazione legacy).  */}
      {/* ---------------------------------------------------------------- */}
      <div className="space-y-8 md:hidden">
        {groups.length === 0 ? (
          <p className="text-sm text-text-muted">{t("noGroups")}</p>
        ) : (
          <ul className="space-y-2">
            {groups.map((g) => (
              <li key={g.id}>
                <Link
                  href={`/app/gruppi/${g.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-text"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface-2">
                    <Users className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="font-medium">{g.name}</span>
                      {isInstructorRole(g.role) && (
                        <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-text-muted">
                          {GROUP_ROLE_LABEL[g.role]}
                        </span>
                      )}
                    </span>
                    <span className="font-mono text-[11px] text-text-muted">
                      {GROUP_TYPE_LABEL[g.type]} · {t("memberCount", { count: g.memberCount })}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <div className="rounded-2xl border border-border bg-surface p-5">
          <span className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-text-muted">
            <Plus className="h-3.5 w-3.5" /> {t("createGroupTitle")}
          </span>
          <p className="mt-2 text-sm text-text-muted">{t("createGroupDesc")}</p>
          <div className="mt-4">
            <CreateGroupForm />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5">
          <span className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-text-muted">
            <KeyRound className="h-3.5 w-3.5" /> {t("joinWithCodeTitle")}
          </span>
          <p className="mt-2 text-sm text-text-muted">{t("joinWithCodeDesc")}</p>
          <div className="mt-4">
            <JoinForm />
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Desktop: redesign approvato — masthead + due colonne (Roster).     */}
      {/* ---------------------------------------------------------------- */}
      <div className="hidden md:block">
        <div className="space-y-8">
          {/* Masthead editoriale */}
          <div>
            <p className="font-mono text-[11px] uppercase tracking-widest text-text-muted">
              {t("indexEyebrow")}
            </p>
            <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">
              {t("indexHeading")}
            </h1>
            <p className="mt-2 max-w-2xl text-text-muted">{t("indexIntro")}</p>
          </div>

          <div className="grid grid-cols-[1fr_20rem] gap-8">
            {/* Colonna sinistra — i tuoi gruppi come card (2 colonne larghe) */}
            <div className="grid gap-3 xl:grid-cols-2">
              {groups.length === 0 ? (
                <div className="rounded-2xl border border-border bg-surface p-8 text-center xl:col-span-2">
                  <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-surface-2">
                    <Users className="h-5 w-5 text-text-muted" />
                  </span>
                  <p className="mt-4 text-sm text-text-muted">{t("noGroups")}</p>
                </div>
              ) : (
                groups.map((g) => (
                  <Link
                    key={g.id}
                    href={`/app/gruppi/${g.id}`}
                    className="group flex w-full items-center gap-4 rounded-2xl border border-border bg-surface p-5 text-left transition-colors hover:border-text"
                  >
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-surface-2">
                      <Users className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="font-medium">{g.name}</span>
                        {isInstructorRole(g.role) && (
                          <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-text-muted">
                            {GROUP_ROLE_LABEL[g.role]}
                          </span>
                        )}
                      </span>
                      <span className="block font-mono text-[11px] text-text-muted">
                        {GROUP_TYPE_LABEL[g.type]} · {t("memberCount", { count: g.memberCount })}
                      </span>
                    </span>
                    {/* I dati reali espongono solo memberCount: niente identità
                        membri fabbricate — pill generica con il conteggio. */}
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-2.5 py-1",
                        "font-mono text-[11px] tabular-nums text-text-muted",
                      )}
                    >
                      <Users className="h-3 w-3" />
                      {g.memberCount}
                    </span>
                  </Link>
                ))
              )}
            </div>

            {/* Colonna destra — rail azioni (form reali, solo restyle card) */}
            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-surface p-5">
                <span className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-text-muted">
                  <Plus className="h-3.5 w-3.5" /> {t("createGroupTitle")}
                </span>
                <p className="mt-2 text-sm text-text-muted">{t("createGroupDesc")}</p>
                <div className="mt-4">
                  <CreateGroupForm />
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-surface p-5">
                <span className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-text-muted">
                  <KeyRound className="h-3.5 w-3.5" /> {t("joinWithCodeTitle")}
                </span>
                <p className="mt-2 text-sm text-text-muted">{t("joinWithCodeDesc")}</p>
                <div className="mt-4">
                  <JoinForm />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
