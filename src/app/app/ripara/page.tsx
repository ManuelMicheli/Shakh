import Link from "next/link";
import { createClient, getUser } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { decodeEval, toMoverCp } from "@/lib/analysis/evalScore";
import { moverFromPly } from "@/lib/ai/format";
import { MobilePageHeader } from "@/components/layout/MobilePageHeader";

export const metadata = { title: "Fix your mistakes — Shakh" };

interface GameRow {
  id: string;
  white: string | null;
  black: string | null;
  played_at: string | null;
  created_at: string;
  user_color: "white" | "black" | null;
}

interface AnalysisRow {
  game_id: string;
  ply: number;
  eval_before: number | null;
  eval_after: number | null;
  classification: string | null;
}

interface Mistake {
  gameId: string;
  ply: number;
  moveNo: number;
  label: string;
  cpLoss: number;
  classification: "mistake" | "blunder";
}

const MAX_GAMES = 25;
const TOP_MISTAKES = 15;

export default async function RiparaPage() {
  const supabase = await createClient();
  const user = await getUser();

  const { data: gamesData } = await supabase
    .from("games")
    .select("id, white, black, played_at, created_at, user_color")
    .eq("user_id", user!.id)
    .eq("analyzed", true)
    .order("played_at", { ascending: false, nullsFirst: false })
    .limit(MAX_GAMES);
  const games = (gamesData as GameRow[] | null) ?? [];

  let mistakes: Mistake[] = [];
  if (games.length > 0) {
    const colorOf = new Map(games.map((g) => [g.id, g.user_color]));
    const labelOf = new Map(
      games.map((g) => [g.id, `${g.white ?? "?"} – ${g.black ?? "?"}`]),
    );
    const { data: rowsData } = await supabase
      .from("game_analysis")
      .select("game_id, ply, eval_before, eval_after, classification")
      .in(
        "game_id",
        games.map((g) => g.id),
      )
      .in("classification", ["mistake", "blunder"]);
    const rows = (rowsData as AnalysisRow[] | null) ?? [];

    for (const r of rows) {
      const color = colorOf.get(r.game_id);
      if (!color) continue;
      if (moverFromPly(r.ply) !== color) continue; // solo errori dell'utente
      if (r.eval_before == null || r.eval_after == null) continue;
      const isWhite = color === "white";
      const cb = toMoverCp(decodeEval(r.eval_before), isWhite);
      const ca = toMoverCp(decodeEval(r.eval_after), isWhite);
      const cpLoss = Math.max(0, cb - ca);
      mistakes.push({
        gameId: r.game_id,
        ply: r.ply,
        moveNo: Math.ceil(r.ply / 2),
        label: labelOf.get(r.game_id) ?? "Game",
        cpLoss,
        classification: r.classification === "blunder" ? "blunder" : "mistake",
      });
    }
    mistakes = mistakes.sort((a, b) => b.cpLoss - a.cpLoss).slice(0, TOP_MISTAKES);
  }

  return (
    <div className="space-y-8">
      <MobilePageHeader
        eyebrow="From your mistakes"
        title="Fix mistakes"
        desc="3 targeted puzzles for each blunder: you slip, you train, you retest."
      />
      <div className="hidden md:block">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Fix your mistakes
        </h1>
        <p className="mt-2 max-w-2xl text-text-muted">
          Your worst mistakes in analyzed games. For each one we generate
          3 targeted puzzles on the same motif: you slip, you train, you retest.
        </p>
      </div>

      {mistakes.length === 0 ? (
        <Card>
          <CardContent className="space-y-3 py-6 text-center">
            <p className="text-text-muted">
              No mistakes to fix: analyze a few games to populate the list.
            </p>
            <Link href="/app/partite">
              <Button>Go to games</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-2">
          {mistakes.map((m) => (
            <li key={`${m.gameId}-${m.ply}`}>
              <Card>
                <CardContent className="flex items-center gap-4 py-3">
                  <Badge
                    variant="muted"
                    className="shrink-0"
                  >
                    {m.classification === "blunder" ? "blunder" : "mistake"}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{m.label}</p>
                    <p className="text-xs text-text-muted">
                      Move {m.moveNo} · lost{" "}
                      <span className="font-mono">−{(m.cpLoss / 100).toFixed(1)}</span>
                    </p>
                  </div>
                  <Link href={`/app/ripara/${m.gameId}/${m.ply}`} className="shrink-0">
                    <Button size="sm">Train</Button>
                  </Link>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
