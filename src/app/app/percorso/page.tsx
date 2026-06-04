import { redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import { recomputePath } from "@/lib/path/recompute";
import { loadWeakest } from "@/lib/path/read";
import { computeNextStep } from "@/lib/path/recommend";
import { SkillTree } from "@/components/percorso/SkillTree";
import { NextStep } from "@/components/percorso/NextStep";
import { MobilePageHeader } from "@/components/layout/MobilePageHeader";

export const metadata = { title: "Path — Shakh" };

export default async function PercorsoPage() {
  const supabase = await createClient();
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
  const step = computeNextStep(currentLevel, nodes, weakest);

  return (
    <div className="space-y-8">
      <MobilePageHeader
        eyebrow="From beginner to club"
        title="Path"
        desc="Nodes unlock as you master the previous ones."
      />

      {/* DESKTOP: testata classica. */}
      <div className="hidden md:block">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Path</h1>
        <p className="mt-2 text-text-muted">
          From beginner to club player. Nodes unlock as you prove you&apos;ve
          mastered the previous ones.
        </p>
      </div>

      <NextStep step={step} />

      <SkillTree nodes={nodes} />

      <p className="text-xs text-text-muted">
        The curriculum is an instructional-design draft: a starting point, not a
        definitive truth.
      </p>
    </div>
  );
}
