"use client";

import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { DrawShape } from "chessground/draw";
import { useChessGame } from "@/lib/chess/useChessGame";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const ChessBoard = dynamic(
  () => import("@/components/chess/ChessBoard").then((m) => m.ChessBoard),
  { ssr: false },
);

export interface GuidedReplayProps {
  title: string;
  intro: string;
  pgn: string;
  comments: string[];
}

export function GuidedReplay({ title, intro, pgn, comments }: GuidedReplayProps) {
  const game = useChessGame();
  const loaded = useRef(false);

  // Carica il PGN una sola volta e posizionati all'inizio.
  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    if (game.loadPgn(pgn)) game.first();
  }, [game, pgn]);

  const cursor = game.cursor; // -1 = posizione iniziale
  const total = game.history.length;
  const atStart = cursor < 0;
  const atEnd = cursor >= total - 1;

  // Freccia sull'ultima mossa giocata (derivata, niente coordinate a mano).
  const shapes: DrawShape[] =
    game.lastMove != null
      ? [{ orig: game.lastMove[0], dest: game.lastMove[1], brush: "green" }]
      : [];

  const comment = atStart ? intro : comments[cursor] ?? "";

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] 2xl:grid-cols-[auto_minmax(18rem,1fr)]">
      <div className="board-sized mx-auto w-full max-w-xl space-y-3 lg:max-w-none">
        <ChessBoard
          fen={game.fen}
          orientation="white"
          mode="view"
          lastMove={game.lastMove}
          check={game.isCheck}
          shapes={shapes}
        />
        <div className="flex items-center justify-between gap-3">
          <Button variant="secondary" size="sm" onClick={game.prev} disabled={atStart}>
            ← Indietro
          </Button>
          <span className="font-mono text-sm text-text-muted">
            {atStart ? "inizio" : `mossa ${Math.ceil((cursor + 1) / 2)}`} {total > 0 && `/ ${Math.ceil(total / 2)}`}
          </span>
          <Button size="sm" onClick={game.next} disabled={atEnd}>
            Avanti →
          </Button>
        </div>
      </div>

      <aside className="space-y-4">
        <Card>
          <CardContent className="space-y-2 py-4">
            <p className="font-display text-lg font-medium">{title}</p>
            <p className="text-sm leading-relaxed text-text-muted">{comment}</p>
          </CardContent>
        </Card>
        {atEnd && total > 0 && (
          <Link href="/app/impara">
            <Button variant="secondary" className="w-full">
              Torna a Impara
            </Button>
          </Link>
        )}
      </aside>
    </div>
  );
}
