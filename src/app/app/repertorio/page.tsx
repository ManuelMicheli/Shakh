import { createClient, getUser } from "@/lib/supabase/server";
import { RepertoireList, type RepertoireItem } from "@/components/theory/RepertoireList";
import { MobilePageHeader } from "@/components/layout/MobilePageHeader";
import type { PieceColor } from "@/lib/theory/repertoire";

export const metadata = { title: "Repertoire — Shakh" };

interface RepRow {
  id: string;
  name: string;
  color: PieceColor;
  repertoire_moves: { count: number }[];
}

export default async function RepertorioPage() {
  const supabase = await createClient();
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
        eyebrow="Your lines"
        title="Repertoire"
        desc="Build lines by color, then drill them with spaced repetition."
      />
      <div className="hidden md:block">
        <h1 className="font-display text-3xl font-semibold tracking-tight">My repertoire</h1>
        <p className="mt-2 max-w-2xl text-text-muted">
          Build your lines by color, then drill them with spaced repetition.
          Add moves by playing on the board or from the explorer.
        </p>
      </div>
      <RepertoireList items={items} />
    </div>
  );
}
