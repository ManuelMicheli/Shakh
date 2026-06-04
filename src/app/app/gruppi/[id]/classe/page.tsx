import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient, getUser } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CompetenceRadar } from "@/components/progress";
import { ClassRoster, type RosterStudent } from "@/components/groups/ClassRoster";
import { ClassSynthesis } from "@/components/groups/ClassSynthesis";
import { loadClassData } from "@/lib/groups/class";
import { getMyGroupRole, isInstructorRole } from "@/lib/groups/access";
import { activeLocale } from "@/lib/i18n/content";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ClassePage({ params }: PageProps) {
  const { id } = await params;
  const t = await getTranslations("groups");
  const supabase = await createClient();
  const user = await getUser();
  if (!user) redirect("/login");

  // Vista istruttore: gating server-side (oltre alla RLS sui dati degli allievi).
  const role = await getMyGroupRole(supabase, id, user.id);
  if (!isInstructorRole(role)) notFound();

  const { data: group } = await supabase
    .from("groups")
    .select("name")
    .eq("id", id)
    .maybeSingle<{ name: string }>();
  if (!group) notFound();

  const data = await loadClassData(supabase, id, await activeLocale());

  // Solo gli allievi (member) nel roster; istruttori/owner restano fuori.
  const roster: RosterStudent[] = data.students
    .filter((s) => s.role === "member")
    .map((s) => ({
      userId: s.userId,
      name: s.name,
      role: s.role,
      level: s.level,
      tacticRating: s.tacticRating,
      accuracy: s.accuracy,
      lastActivity: s.lastActivity,
    }));

  const radarAreas = data.competenceByArea.map((a) => ({ label: a.label, value: a.avgScore }));

  return (
    <div className="space-y-8">
      <div>
        <Link href={`/app/gruppi/${id}`} className="text-sm text-text-muted hover:text-text">
          ← {group.name}
        </Link>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
          {t("classDashboard")}
        </h1>
        <p className="mt-1 text-text-muted">
          {t("classDashboardIntro", { count: roster.length })}
        </p>
      </div>

      {roster.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-text-muted">
            {t("classEmptyState")}
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{t("students")}</CardTitle>
              <CardDescription>
                {t("studentsDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ClassRoster groupId={id} students={roster} />
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t("avgProficiencyTitle")}</CardTitle>
                <CardDescription>{t("avgProficiencyDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                <CompetenceRadar areas={radarAreas} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("commonWeaknessesTitle")}</CardTitle>
                <CardDescription>{t("commonWeaknessesDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                {data.commonWeaknesses.length === 0 ? (
                  <p className="py-6 text-sm text-text-muted">
                    {t("noSharedWeaknesses")}
                  </p>
                ) : (
                  <ul className="divide-y divide-border">
                    {data.commonWeaknesses.map((w) => (
                      <li
                        key={w.label}
                        className="flex items-center justify-between gap-3 py-2.5 text-sm"
                      >
                        <span className="min-w-0 truncate">{w.label}</span>
                        <Badge variant="muted">
                          {t("studentCount", { count: w.count })}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t("classSummaryTitle")}</CardTitle>
              <CardDescription>{t("classSummaryDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <ClassSynthesis groupId={id} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
