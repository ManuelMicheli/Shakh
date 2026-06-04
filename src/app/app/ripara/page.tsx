import Link from "next/link";
import { createClient, getUser } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { decodeEval, toMoverCp } from "@/lib/analysis/evalScore";
import { moverFromPly } from "@/lib/ai/format";
import { MobilePageHeader } from "@/components/layout/MobilePageHeader";

export const metadata = { title: "Ripara i tuoi errori — Shakh" };

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
        label: labelOf.get(r.game_id) ?? "Partita",
        cpLoss,
        classification: r.classification === "blunder" ? "blunder" : "mistake",
      });
    }
    mistakes = mistakes.sort((a, b) => b.cpLoss - a.cpLoss).slice(0, TOP_MISTAKES);
  }

  return (
    <div className="space-y-8">
      <MobilePageHeader
        eyebrow="Dai tuoi sbagli"
        title="Ripara errori"
        desc="3 puzzle mirati per ogni errore grave: sbagli, alleni, ritesti."
      />
      <div className="hidden md:block">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Ripara i tuoi errori
        </h1>
        <p className="mt-2 max-w-2xl text-text-muted">
          I tuoi sbagli più gravi nelle partite analizzate. Per ognuno generiamo
          3 puzzle mirati sullo stesso motivo: sbagli, alleni, ritesti.
        </p>
      </div>

      {mistakes.length === 0 ? (
        <Card>
          <CardContent className="space-y-3 py-6 text-center">
            <p className="text-text-muted">
              Nessun errore da riparare: analizza qualche partita per popolare l&apos;elenco.
            </p>
            <Link href="/app/partite">
              <Button>Vai alle partite</Button>
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
                    {m.classification === "blunder" ? "blunder" : "errore"}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{m.label}</p>
                    <p className="text-xs text-text-muted">
                      Mossa {m.moveNo} · perso{" "}
                      <span className="font-mono">−{(m.cpLoss / 100).toFixed(1)}</span>
                    </p>
                  </div>
                  <Link href={`/app/ripara/${m.gameId}/${m.ply}`} className="shrink-0">
                    <Button size="sm">Allena</Button>
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
