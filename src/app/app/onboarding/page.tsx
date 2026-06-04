import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient, getUser } from "@/lib/supabase/server";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import type { LinkedAccount } from "@/app/app/profilo/actions";
import type { ExternalSource } from "@/lib/rating/calibration";

export async function generateMetadata() {
  const t = await getTranslations("common");
  return { title: t("page.title") };
}

/**
 * Primo accesso (prompt 07, §2): presentazione + autovalutazione + collegamento
 * account online + mini-test tattico + benvenuto. Mostrato finché
 * `onboarding_completed = false`.
 */
export default async function OnboardingPage() {
  const supabase = await createClient();
  const user = await getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed, display_name, username")
    .eq("id", user.id)
    .maybeSingle<{
      onboarding_completed: boolean;
      display_name: string | null;
      username: string | null;
    }>();

  if (profile?.onboarding_completed) redirect("/app");

  // Account già collegati (es. rientro nel flusso dopo un collegamento parziale).
  const { data: extRows } = await supabase
    .from("external_accounts")
    .select("source, username, rating_native, rating_otb, n_games, verified, verify_token, fetched_at")
    .eq("user_id", user.id);
  const linkedAccounts: LinkedAccount[] = (
    (extRows as
      | {
          source: ExternalSource;
          username: string;
          rating_native: number | null;
          rating_otb: number | null;
          n_games: number;
          verified: boolean;
          verify_token: string | null;
          fetched_at: string;
        }[]
      | null) ?? []
  ).map((r) => ({
    source: r.source,
    username: r.username,
    ratingNative: r.rating_native,
    ratingOtb: r.rating_otb,
    nGames: r.n_games,
    verified: r.verified,
    verifyToken: r.verify_token,
    fetchedAt: r.fetched_at,
  }));

  const name = profile?.display_name ?? profile?.username ?? null;

  return (
    <div className="py-6">
      <OnboardingFlow name={name} initialAccounts={linkedAccounts} />
    </div>
  );
}
