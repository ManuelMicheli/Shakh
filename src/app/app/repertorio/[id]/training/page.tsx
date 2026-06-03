import { notFound } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import { OpeningTrainer } from "@/components/theory/OpeningTrainer";
import {
  rowsToTree,
  type RepertoireMoveRow,
  type PieceColor,
} from "@/lib/theory/repertoire";

export default async function TrainingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ review?: string }>;
}) {
  const { id } = await params;
  const { review } = await searchParams;
  const reviewMode = review === "1" || review === "true";

  const supabase = await createClient();
  const user = await getUser();

  const { data: rep } = await supabase
    .from("repertoires")
    .select("id, name, color")
    .eq("id", id)
    .maybeSingle<{ id: string; name: string; color: PieceColor }>();
  if (!rep) notFound();

  const { data: rows } = await supabase
    .from("repertoire_moves")
    .select("id, parent_move_id, ply, san, fen, annotation, eval, order_index")
    .eq("repertoire_id", id);

  const moveRows = (rows as RepertoireMoveRow[] | null) ?? [];
  const tree = rowsToTree(moveRows);

  // Rimando alle Trappole (06d §5): segnala le trappole note la cui posizione
  // d'innesco combacia con una posizione del repertorio in allenamento.
  const posKey = (fen: string) => fen.split(" ").slice(0, 4).join(" ");
  const treeKeys = new Set(Object.values(tree.nodes).map((n) => posKey(n.fen)));
  const { data: trapRows } = await supabase
    .from("traps")
    .select("name, slug, trigger_fen")
    .eq("published", true);
  const trapWarnings = ((trapRows as { name: string; slug: string; trigger_fen: string }[] | null) ?? [])
    .filter((t) => treeKeys.has(posKey(t.trigger_fen)))
    .map((t) => ({ fen: t.trigger_fen, name: t.name, slug: t.slug }));

  // Item in scadenza appartenenti a QUESTO repertorio.
  const ids = moveRows.map((r) => r.id);
  let dueIds: string[] = [];
  if (ids.length > 0) {
    const { data: due } = await supabase
      .from("repertoire_training")
      .select("repertoire_move_id, due_at")
      .eq("user_id", user!.id)
      .lte("due_at", new Date().toISOString())
      .in("repertoire_move_id", ids);
    dueIds = ((due as { repertoire_move_id: string }[] | null) ?? []).map(
      (d) => d.repertoire_move_id,
    );
  }

  if (moveRows.length === 0) {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center">
        <h1 className="font-display text-2xl font-semibold">{rep.name}</h1>
        <p className="mt-2 text-text-muted">
          Repertorio vuoto: aggiungi prima qualche linea nell&apos;editor.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <OpeningTrainer
        repertoireId={rep.id}
        name={rep.name}
        color={rep.color}
        tree={tree}
        dueIds={dueIds}
        reviewMode={reviewMode}
        trapWarnings={trapWarnings}
      />
    </div>
  );
}
