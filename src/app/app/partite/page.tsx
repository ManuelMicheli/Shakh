import { getTranslations } from "next-intl/server";
import { createClient, getUser } from "@/lib/supabase/server";
import { ImportPanel } from "@/components/games/ImportPanel";
import { GamesTable } from "@/components/games/GamesTable";
import { MobilePageHeader } from "@/components/layout/MobilePageHeader";
import type { GameRow } from "@/lib/games/types";

export async function generateMetadata() {
  const t = await getTranslations("games");
  return { title: t("metaTitle") };
}

export default async function PartitePage() {
  const t = await getTranslations("games");
  const supabase = await createClient();
  const user = await getUser();

  const { data: games } = await supabase
    .from("games")
    .select("*")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  // Un account verificato è la condizione perché le partite importate incidano
  // sul profilo: se manca, l'import invita (in modo opzionale) a verificarlo.
  const { count: verifiedCount } = await supabase
    .from("external_accounts")
    .select("user_id", { count: "exact", head: true })
    .eq("user_id", user!.id)
    .eq("verified", true);
  const hasVerifiedAccount = (verifiedCount ?? 0) > 0;

  return (
    <div className="space-y-8">
      <MobilePageHeader
        eyebrow={t("headerEyebrow")}
        title={t("headerTitle")}
        desc={t("headerDesc")}
      />

      {/* DESKTOP: testata classica. */}
      <div className="hidden md:block">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          {t("headerTitle")}
        </h1>
        <p className="mt-2 text-text-muted">
          {t("pageIntro")}
        </p>
      </div>

      <ImportPanel hasVerifiedAccount={hasVerifiedAccount} />

      <GamesTable games={(games as GameRow[] | null) ?? []} />
    </div>
  );
}
