import { createClient } from "@/lib/supabase/server";
import { RepertoireList, type RepertoireItem } from "@/components/theory/RepertoireList";
import type { PieceColor } from "@/lib/theory/repertoire";

export const metadata = { title: "Repertorio — Shakh" };

interface RepRow {
  id: string;
  name: string;
  color: PieceColor;
  repertoire_moves: { count: number }[];
}

export default async function RepertorioPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Il mio repertorio</h1>
        <p className="mt-2 max-w-2xl text-text-muted">
          Costruisci le tue linee per colore, poi allenale con la ripetizione spaziata.
          Aggiungi mosse muovendo sulla scacchiera o dall&apos;explorer.
        </p>
      </div>
      <RepertoireList items={items} />
    </div>
  );
}
