import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { recomputePath } from "@/lib/path/recompute";
import { loadWeakest } from "@/lib/path/read";
import { computeNextStep } from "@/lib/path/recommend";
import { SkillTree } from "@/components/percorso/SkillTree";
import { NextStep } from "@/components/percorso/NextStep";

export const metadata = { title: "Percorso — Shakh" };

export default async function PercorsoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Percorso</h1>
        <p className="mt-2 text-text-muted">
          Da principiante a giocatore di club. I nodi si sbloccano man mano che
          dimostri di padroneggiare i precedenti.
        </p>
      </div>

      <NextStep step={step} />

      <SkillTree nodes={nodes} />

      <p className="text-xs text-text-muted">
        Il curriculum è una bozza di design didattico: un punto di partenza, non
        una verità definitiva.
      </p>
    </div>
  );
}
