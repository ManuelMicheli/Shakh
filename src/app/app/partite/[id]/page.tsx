import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GameReview } from "@/components/games/GameReview";
import type { AnalysisRow, GameRow } from "@/lib/games/types";

export default async function GameReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // La RLS garantisce che l'utente veda solo le proprie partite.
  const { data: game } = await supabase
    .from("games")
    .select("*")
    .eq("id", id)
    .maybeSingle<GameRow>();

  if (!game) notFound();

  const { data: analysis } = await supabase
    .from("game_analysis")
    .select("ply, san, fen, eval_before, eval_after, best_move_san, classification, ai_comment")
    .eq("game_id", id)
    .order("ply", { ascending: true });

  return (
    <div className="mx-auto max-w-5xl">
      <GameReview
        game={{
          id: game.id,
          pgn: game.pgn,
          white: game.white,
          black: game.black,
          result: game.result,
          userColor: game.user_color,
          analyzed: game.analyzed,
        }}
        analysis={(analysis as AnalysisRow[] | null) ?? []}
        coachConfigured={Boolean(process.env.ANTHROPIC_API_KEY)}
      />
    </div>
  );
}
