import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RepairSession } from "@/components/repair/RepairSession";
import { getTranslations } from "next-intl/server";
import { getRepairPuzzles, type RepairData } from "../../actions";

export async function generateMetadata() {
  const t = await getTranslations("metadata");
  return { title: t("fixMistake") };
}

export default async function RiparaDrillPage({
  params,
}: {
  params: Promise<{ gameId: string; ply: string }>;
}) {
  const { gameId, ply } = await params;
  const plyNum = Number(ply);
  const data: RepairData = Number.isFinite(plyNum)
    ? await getRepairPuzzles(gameId, plyNum)
    : { ok: false, error: "Invalid move." };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Fix the mistake</h1>
        <Link href="/app/ripara" className="text-sm text-text-muted hover:text-text">
          ← Mistakes
        </Link>
      </div>

      {data.ok && data.puzzles && data.puzzles.length > 0 ? (
        <RepairSession
          puzzles={data.puzzles}
          motifLabel={data.motifLabel ?? "Training"}
          gameId={gameId}
        />
      ) : (
        <Card>
          <CardContent className="space-y-3 py-6 text-center">
            <p className="text-text-muted">
              {("error" in data && data.error) || "Couldn't generate puzzles for this mistake."}
            </p>
            <Link href="/app/ripara">
              <Button variant="secondary">Back to mistakes</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
