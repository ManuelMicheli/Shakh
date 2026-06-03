import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ReelPlayer } from "@/components/reel/ReelPlayer";
import { ShareReel } from "@/components/reel/ShareReel";
import { pickHighlight, type HighlightRow } from "@/lib/reel/highlight";
import { encodeReel, type ReelData } from "@/lib/reel/payload";

export const metadata = { title: "Reel — Shakh" };

export default async function ReelGeneratePage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;
  const supabase = await createClient();

  const { data: game } = await supabase
    .from("games")
    .select("white, black, user_color, analyzed")
    .eq("id", gameId)
    .maybeSingle<{
      white: string | null;
      black: string | null;
      user_color: "white" | "black" | null;
      analyzed: boolean;
    }>();

  const { data: rowsData } = await supabase
    .from("game_analysis")
    .select("ply, san, fen, eval_after, classification")
    .eq("game_id", gameId);
  const rows = (rowsData as HighlightRow[] | null) ?? [];

  const userColor = game?.user_color ?? "white";
  const highlight = game && rows.length > 0 ? pickHighlight(rows, userColor) : null;

  const reel: ReelData | null = highlight
    ? { ...highlight, title: game ? `${game.white ?? "?"} – ${game.black ?? "?"}` : undefined }
    : null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Reel della partita</h1>
        <Link href={`/app/partite/${gameId}`} className="text-sm text-text-muted hover:text-text">
          ← Partita
        </Link>
      </div>

      {!reel ? (
        <Card>
          <CardContent className="space-y-3 py-6 text-center">
            <p className="text-text-muted">
              {game?.analyzed
                ? "Nessuna mossa notevole da mettere in clip per questa partita."
                : "Analizza prima la partita per generare il reel."}
            </p>
            <Link href={`/app/partite/${gameId}`}>
              <Button variant="secondary">Vai alla partita</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          <ReelPlayer data={reel} />
          <Card>
            <CardContent className="space-y-3 py-4">
              <p className="text-sm font-medium">Condividi la clip</p>
              <p className="text-xs text-text-muted">
                Il link è autocontenuto: chi lo apre vede solo questa mossa, non l&apos;intera partita.
              </p>
              <ShareReel encoded={encodeReel(reel)} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
