import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient, getUser } from "@/lib/supabase/server";
import { recomputePath } from "@/lib/path/recompute";
import { loadWeakest } from "@/lib/path/read";
import { computeNextStep } from "@/lib/path/recommend";
import { activeLocale } from "@/lib/i18n/content";
import { SkillTree } from "@/components/percorso/SkillTree";
import { NextStep } from "@/components/percorso/NextStep";
import { MobilePageHeader } from "@/components/layout/MobilePageHeader";

export async function generateMetadata() {
  const t = await getTranslations("study");
  return { title: t("path.metaTitle") };
}

export default async function PercorsoPage() {
  const supabase = await createClient();
  const t = await getTranslations("study");
  const user = await getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", user.id)
    .maybeSingle<{ onboarding_completed: boolean }>();

  // Diagnostico non fatto: meglio passare di lì per posizionarsi nel percorso.
  if (profile && !profile.onboarding_completed) redirect("/app/onboarding");

  // Ricalcolo idempotente: legge i progressi dei moduli e aggiorna lo stato.
  const { nodes, currentLevel } = await recomputePath(supabase, user.id);
  const weakest = await loadWeakest(supabase, user.id);
  const step = computeNextStep(currentLevel, nodes, weakest, await activeLocale());

  return (
    <div className="space-y-8">
      <MobilePageHeader
        eyebrow={t("path.eyebrow")}
        title={t("path.title")}
        desc={t("path.desc")}
      />

      {/* DESKTOP: testata classica. */}
      <div className="hidden md:block">
        <h1 className="font-display text-3xl font-semibold tracking-tight">{t("path.title")}</h1>
        <p className="mt-2 text-text-muted">
          {t("path.intro")}
        </p>
      </div>

      <NextStep step={step} />

      <SkillTree nodes={nodes} />

      <p className="text-xs text-text-muted">
        {t("path.curriculumNote")}
      </p>
    </div>
  );
}
