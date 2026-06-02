import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";

export const metadata = { title: "Diagnostico — Shakh" };

/**
 * Diagnostico iniziale (prompt 07, §2): autovalutazione + mini-test tattico +
 * import opzionale. Mostrato finché `onboarding_completed = false`.
 */
export default async function OnboardingPage() {
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

  if (profile?.onboarding_completed) redirect("/app/percorso");

  return (
    <div className="mx-auto max-w-2xl py-6">
      <OnboardingFlow />
    </div>
  );
}
