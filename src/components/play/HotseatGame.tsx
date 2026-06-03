"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { Square, PieceSymbol } from "chess.js";
import { Undo2, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";
import { useChessGame } from "@/lib/chess/useChessGame";
import { findTimeControl } from "@/lib/play/time-controls";
import { BoardControls } from "@/components/chess/BoardControls";
import { MoveList } from "@/components/chess/MoveList";
import { GameClock } from "./GameClock";
import { TimeControlPicker } from "./TimeControlPicker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const ChessBoard = dynamic(
  () => import("@/components/chess/ChessBoard").then((m) => m.ChessBoard),
  { ssr: false },
);

type Color = "white" | "black";

/** Partita contro un amico sullo STESSO dispositivo (hotseat). Tutto client-side. */
export function HotseatGame() {
  const game = useChessGame();
  const [phase, setPhase] = useState<"setup" | "play">("setup");
  const [tcId, setTcId] = useState("10+0");
  const [autoFlip, setAutoFlip] = useState(true);
  const [orientation, setOrientation] = useState<Color>("white");

  const [whiteMs, setWhiteMs] = useState<number | null>(null);
  const [blackMs, setBlackMs] = useState<number | null>(null);
  const [flagged, setFlagged] = useState<null | "w" | "b">(null);

  const lastTick = useRef(0);
  const prevLen = useRef(0);
  const boardWrapRef = useRef<HTMLDivElement>(null);

  const tc = findTimeControl(tcId);
  const atLive = game.cursor >= game.history.length - 1;
  const finishedByRules = game.isCheckmate || game.isStalemate || game.isDraw;
  const over = finishedByRules || flagged != null;

  const start = useCallback(() => {
    game.reset();
    setWhiteMs(tc.initialMs);
    setBlackMs(tc.initialMs);
    setFlagged(null);
    prevLen.current = 0;
    lastTick.current = Date.now();
    setOrientation("white");
    setPhase("play");
  }, [game, tc.initialMs]);

  // Auto-gira la scacchiera dal lato di chi deve muovere.
  useEffect(() => {
    if (phase === "play" && autoFlip && atLive && !over) {
      setOrientation(game.turn === "w" ? "white" : "black");
    }
  }, [phase, autoFlip, atLive, over, game.turn]);

  // Incremento (Fischer) dopo ogni mossa effettiva.
  useEffect(() => {
    if (phase !== "play") return;
    const len = game.history.length;
    if (len > prevLen.current) {
      const mover = game.turn === "w" ? "b" : "w"; // chi ha appena mosso
      if (tc.initialMs != null && tc.incMs > 0) {
        if (mover === "w") setWhiteMs((m) => (m == null ? m : m + tc.incMs));
        else setBlackMs((m) => (m == null ? m : m + tc.incMs));
      }
      lastTick.current = Date.now();
    }
    prevLen.current = len;
  }, [game.history.length, game.turn, phase, tc.initialMs, tc.incMs]);

  // Scorrimento dell'orologio del lato al tratto.
  useEffect(() => {
    if (phase !== "play" || over || tc.initialMs == null || !atLive) return;
    lastTick.current = Date.now();
    const id = setInterval(() => {
      const now = Date.now();
      const delta = now - lastTick.current;
      lastTick.current = now;
      const dec = (m: number | null): number | null => {
        if (m == null) return m;
        const n = m - delta;
        return n <= 0 ? 0 : n;
      };
      if (game.turn === "w") {
        setWhiteMs((m) => {
          const n = dec(m);
          if (n === 0) setFlagged("w");
          return n;
        });
      } else {
        setBlackMs((m) => {
          const n = dec(m);
          if (n === 0) setFlagged("b");
          return n;
        });
      }
    }, 100);
    return () => clearInterval(id);
  }, [phase, over, tc.initialMs, atLive, game.turn]);

  const onMove = useCallback(
    (from: Square, to: Square, promotion?: PieceSymbol) => {
      if (over || !atLive) return;
      game.move(from, to, promotion);
    },
    [over, atLive, game],
  );

  const takeback = useCallback(() => {
    game.takeback();
    setFlagged(null);
    lastTick.current = Date.now();
  }, [game]);

  // ---------- Setup ----------
  if (phase === "setup") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Stesso dispositivo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm text-text-muted">
            Giocate a turno sullo stesso schermo. La scacchiera può girarsi
            automaticamente dal lato di chi muove.
          </p>
          <div>
            <div className="mb-2 text-xs uppercase tracking-wide text-text-muted">
              Tempo
            </div>
            <TimeControlPicker value={tcId} onChange={setTcId} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={autoFlip}
              onChange={(e) => setAutoFlip(e.target.checked)}
              className="h-4 w-4 accent-[var(--text)]"
            />
            Gira la scacchiera a ogni mossa
          </label>
          <Button onClick={start}>Inizia a giocare</Button>
        </CardContent>
      </Card>
    );
  }

  // ---------- Play ----------
  const status = hotseatStatus(game, flagged);
  const topColor: "w" | "b" = orientation === "white" ? "b" : "w";
  const bottomColor: "w" | "b" = orientation === "white" ? "w" : "b";
  const msOf = (c: "w" | "b") => (c === "w" ? whiteMs : blackMs);
  const nameOf = (c: "w" | "b") => (c === "w" ? "Bianco" : "Nero");

  const atEnd = game.cursor >= game.history.length - 1;

  return (
    <div className="lg:grid lg:gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] 2xl:grid-cols-[auto_20rem] 2xl:justify-center">
      <div className="board-sized lg:mx-auto lg:w-full lg:max-w-none">
        {/* Mobile: board + mosse a destra. Desktop: solo board (orologi + controlli sotto). */}
        <div className="flex items-stretch gap-2 lg:block lg:space-y-3">
          <div className="min-w-0 flex-1 space-y-3 lg:flex-none">
            <GameClock
              name={nameOf(topColor)}
              ms={msOf(topColor)}
              active={!over && game.turn === topColor && atLive}
            />
            <div
              ref={boardWrapRef}
              tabIndex={0}
              className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-text"
            >
              <ChessBoard
                fen={game.fen}
                orientation={orientation}
                mode={over ? "view" : "play"}
                movableColor={game.turn === "w" ? "white" : "black"}
                dests={!over && atLive ? game.legalDests : new Map()}
                lastMove={game.lastMove}
                check={game.isCheck}
                onMove={onMove}
              />
            </div>
            <GameClock
              name={nameOf(bottomColor)}
              ms={msOf(bottomColor)}
              active={!over && game.turn === bottomColor && atLive}
            />

            {/* Desktop: controlli completi + stato. */}
            <div className="hidden items-center justify-between gap-3 lg:flex">
              <BoardControls
                onFirst={game.first}
                onPrev={game.prev}
                onNext={game.next}
                onLast={game.last}
                onFlip={() =>
                  setOrientation((o) => (o === "white" ? "black" : "white"))
                }
                atStart={game.cursor < 0}
                atEnd={atEnd}
                keyboardTarget={boardWrapRef}
              />
              <span
                className={cn(
                  "font-mono text-sm",
                  over ? "text-text" : "text-text-muted",
                )}
              >
                {status}
              </span>
            </div>
          </div>

          {/* Mobile: colonna mosse a destra della scacchiera. */}
          <div className="flex w-[4.75rem] shrink-0 flex-col overflow-y-auto rounded-md border border-border bg-surface p-1 lg:hidden">
            <MoveList
              compact
              history={game.history}
              cursor={game.cursor}
              onSelect={game.goTo}
            />
          </div>
        </div>

        {/* Mobile: solo indietro / avanti. */}
        <div className="mt-2 flex items-center justify-center gap-3 lg:hidden">
          <Button
            variant="secondary"
            size="icon"
            onClick={game.prev}
            disabled={game.cursor < 0}
            aria-label="Mossa precedente"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={game.next}
            disabled={atEnd}
            aria-label="Mossa successiva"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <aside className="hidden space-y-4 lg:block">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={takeback}
            disabled={game.history.length === 0}
          >
            <Undo2 className="h-4 w-4" />
            Annulla mossa
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setPhase("setup")}>
            <RotateCcw className="h-4 w-4" />
            Nuova partita
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Mosse</CardTitle>
          </CardHeader>
          <CardContent>
            <MoveList
              history={game.history}
              cursor={game.cursor}
              onSelect={game.goTo}
              className="max-h-72"
            />
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

function hotseatStatus(
  game: ReturnType<typeof useChessGame>,
  flagged: null | "w" | "b",
): string {
  if (flagged) return `${flagged === "w" ? "Bianco" : "Nero"} perde per tempo`;
  if (game.isCheckmate)
    return `Scacco matto — vince il ${game.turn === "w" ? "Nero" : "Bianco"}`;
  if (game.isStalemate) return "Stallo — patta";
  if (game.isDraw) return "Patta";
  const side = game.turn === "w" ? "Bianco" : "Nero";
  return game.isCheck ? `Scacco — muove il ${side}` : `Muove il ${side}`;
}
