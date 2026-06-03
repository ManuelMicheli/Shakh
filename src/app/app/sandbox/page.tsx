"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useChessGame } from "@/lib/chess/useChessGame";
import { useEngineAnalysis } from "@/lib/engine/useEngineAnalysis";
import { toWhiteRelative } from "@/lib/engine/score";
import { MoveList } from "@/components/chess/MoveList";
import { BoardControls } from "@/components/chess/BoardControls";
import { EvalBar } from "@/components/chess/EvalBar";
import { EngineLines } from "@/components/chess/EngineLines";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tooltip } from "@/components/ui/tooltip";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { ENGINE_HELP } from "@/lib/engine/explain";

// chessground accede a `window`: il componente va caricato solo lato client.
const ChessBoard = dynamic(
  () => import("@/components/chess/ChessBoard").then((m) => m.ChessBoard),
  { ssr: false },
);

const SAMPLE_PGN = `[Event "Immortal Game"]
[White "Anderssen"]
[Black "Kieseritzky"]

1. e4 e5 2. f4 exf4 3. Bc4 Qh4+ 4. Kf1 b5 5. Bxb5 Nf6 6. Nf3 Qh6 7. d3 Nh5
8. Nh4 Qg5 9. Nf5 c6 10. g4 Nf6 11. Rg1 cxb5 12. h4 Qg6 13. h5 Qg5 14. Qf3 Ng8
15. Bxf4 Qf6 16. Nc3 Bc5 17. Nd5 Qxb2 18. Bd6 Bxg1 19. e5 Qxa1+ 20. Ke2 Na6
21. Nxg7+ Kd8 22. Qf6+ Nxf6 23. Be7#`;

export default function SandboxPage() {
  const game = useChessGame();
  const { toast } = useToast();
  const [orientation, setOrientation] = useState<"white" | "black">("white");
  const [fenInput, setFenInput] = useState("");
  const [pgnInput, setPgnInput] = useState(SAMPLE_PGN);
  const boardWrapRef = useRef<HTMLDivElement>(null);

  // Motore: analizza la posizione MOSTRATA (segue la navigazione tra le mosse).
  const [engineOn, setEngineOn] = useState(false);
  const [multiPV, setMultiPV] = useState(1);
  const { evaluation, isThinking, engineState, depth } = useEngineAnalysis(
    game.fen,
    { enabled: engineOn, depth: 18, multiPV },
  );

  const topLine = evaluation?.lines[0];
  const engineLabel: Record<string, string> = {
    idle: "spento",
    loading: "caricamento…",
    ready: isThinking ? "analisi…" : "pronto",
    error: "errore",
  };

  const status = (() => {
    if (game.isCheckmate)
      return `Scaccomatto — vince il ${game.turn === "w" ? "Nero" : "Bianco"}`;
    if (game.isStalemate) return "Stallo (patta)";
    if (game.isDraw) return "Patta";
    const side = game.turn === "w" ? "Bianco" : "Nero";
    return game.isCheck ? `Scacco — muove il ${side}` : `Muove il ${side}`;
  })();

  const loadFen = () => {
    const value = fenInput.trim();
    if (!value) return;
    if (game.reset(value)) {
      toast({ title: "Posizione caricata" });
    } else {
      toast({ title: "FEN non valida", variant: "error" });
    }
  };

  const loadPgn = () => {
    const value = pgnInput.trim();
    if (!value) return;
    if (game.loadPgn(value)) {
      toast({ title: "Partita caricata" });
    } else {
      toast({ title: "PGN non valido", variant: "error" });
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            Sandbox scacchiera
          </h1>
          <Badge variant="muted">dev</Badge>
        </div>
        <p className="mt-2 text-text-muted">
          Strumento di sviluppo: gioca, carica una FEN o un PGN, naviga e gira la
          scacchiera. Clic sulla board e poi usa ← → Home/End.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        {/* Board + controlli */}
        <div className="space-y-3">
          <div className="mx-auto flex w-full max-w-3xl gap-2 xl:max-w-[820px]">
            {engineOn && (
              <EvalBar
                score={
                  topLine
                    ? toWhiteRelative(topLine.score, topLine.scoreType, game.turn)
                    : 0
                }
                scoreType={topLine?.scoreType ?? "cp"}
                orientation={orientation}
              />
            )}
            <div
              ref={boardWrapRef}
              tabIndex={0}
              className="flex-1 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-text"
            >
              <ChessBoard
                fen={game.fen}
                orientation={orientation}
                mode="play"
                dests={game.legalDests}
                lastMove={game.lastMove}
                check={game.isCheck}
                onMove={(from, to, promotion) => game.move(from, to, promotion)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <BoardControls
              onFirst={game.first}
              onPrev={game.prev}
              onNext={game.next}
              onLast={game.last}
              onFlip={() =>
                setOrientation((o) => (o === "white" ? "black" : "white"))
              }
              atStart={game.cursor < 0}
              atEnd={game.cursor >= game.history.length - 1}
              keyboardTarget={boardWrapRef}
            />
            <span className="font-mono text-sm text-text-muted">{status}</span>
          </div>
        </div>

        {/* Pannello laterale */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Motore</CardTitle>
                <Button
                  variant={engineOn ? "primary" : "secondary"}
                  size="sm"
                  onClick={() => setEngineOn((v) => !v)}
                >
                  {engineOn ? "Spegni" : "Accendi"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Tooltip content={ENGINE_HELP.lines} side="bottom" className="max-w-xs whitespace-normal">
                    <span className="cursor-help text-text-muted underline decoration-dotted underline-offset-2">
                      Linee
                    </span>
                  </Tooltip>
                  {[1, 2, 3].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setMultiPV(n)}
                      aria-pressed={multiPV === n}
                      className={
                        "h-7 w-7 rounded-md border border-border font-mono text-xs " +
                        (multiPV === n
                          ? "bg-text text-bg"
                          : "bg-surface-2 text-text hover:bg-surface")
                      }
                    >
                      {n}
                    </button>
                  ))}
                </span>
                <Tooltip content={ENGINE_HELP.depth} side="bottom" className="max-w-xs whitespace-normal">
                  <span className="cursor-help font-mono text-xs text-text-muted">
                    profondità {depth} · {engineLabel[engineState]}
                  </span>
                </Tooltip>
              </div>

              {engineOn ? (
                <EngineLines fen={game.fen} lines={evaluation?.lines ?? []} />
              ) : (
                <p className="text-sm text-text-muted">
                  Analisi spenta. Accendi per far valutare la posizione al motore:
                  ti dirà chi sta meglio e qual è la mossa migliore.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Mosse</CardTitle>
            </CardHeader>
            <CardContent>
              <MoveList
                history={game.history}
                cursor={game.cursor}
                onSelect={game.goTo}
                className="max-h-64"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Carica posizione</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="fen">FEN</Label>
                <div className="flex gap-2">
                  <Input
                    id="fen"
                    value={fenInput}
                    onChange={(e) => setFenInput(e.target.value)}
                    placeholder="rnbqkbnr/pppppppp/..."
                    className="font-mono text-xs"
                  />
                  <Button variant="secondary" onClick={loadFen}>
                    Carica
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pgn">PGN</Label>
                <textarea
                  id="pgn"
                  value={pgnInput}
                  onChange={(e) => setPgnInput(e.target.value)}
                  rows={6}
                  className="w-full rounded-md border border-border bg-surface-2 p-2 font-mono text-xs text-text focus-visible:outline-2 focus-visible:outline-offset-2"
                />
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={loadPgn}>
                    Carica PGN
                  </Button>
                  <Button variant="ghost" onClick={() => game.reset()}>
                    Nuova partita
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
