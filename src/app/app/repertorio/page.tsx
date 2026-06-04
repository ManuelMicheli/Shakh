import { getTranslations } from "next-intl/server";
import { createClient, getUser } from "@/lib/supabase/server";
import { RepertoireList, type RepertoireItem } from "@/components/theory/RepertoireList";
import { MobilePageHeader } from "@/components/layout/MobilePageHeader";
import type { PieceColor } from "@/lib/theory/repertoire";

export async function generateMetadata() {
  const t = await getTranslations("study");
  return { title: t("repertoire.metaTitle") };
}

interface RepRow {
  id: string;
  name: string;
  color: PieceColor;
  repertoire_moves: { count: number }[];
}

export default async function RepertorioPage() {
  const supabase = await createClient();
  const t = await getTranslations("study");
  const user = await getUser();

  // RLS limita ai propri repertori; il conteggio mosse arriva dalla relazione.
  const { data } = await supabase
    .from("repertoires")
    .select("id, name, color, repertoire_moves(count)")
    .eq("owner_user_id", user!.id)
    .order("created_at", { ascending: true });

  const items: RepertoireItem[] = ((data as RepRow[] | null) ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    color: r.color,
    moves: r.repertoire_moves?.[0]?.count ?? 0,
  }));

  return (
    <div className="space-y-6">
      <MobilePageHeader
        eyebrow={t("repertoire.eyebrow")}
        title={t("repertoire.title")}
        desc={t("repertoire.desc")}
      />
      <div className="hidden md:block">
        <h1 className="font-display text-3xl font-semibold tracking-tight">{t("repertoire.myTitle")}</h1>
        <p className="mt-2 max-w-2xl text-text-muted">
          {t("repertoire.intro")}
        </p>
      </div>
      <RepertoireList items={items} />
    </div>
  );
}
