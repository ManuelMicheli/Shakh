import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RepertoireEditor } from "@/components/theory/RepertoireEditor";
import {
  rowsToTree,
  type RepertoireMoveRow,
  type PieceColor,
} from "@/lib/theory/repertoire";

export default async function RepertoireEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

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

  const tree = rowsToTree((rows as RepertoireMoveRow[] | null) ?? []);

  return (
    <div className="w-full">
      <RepertoireEditor
        repertoireId={rep.id}
        name={rep.name}
        color={rep.color}
        tree={tree}
      />
    </div>
  );
}
