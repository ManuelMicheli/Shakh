"use client";

import { useEffect, useMemo, useRef } from "react";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import type { DrawShape } from "chessground/draw";
import { useChessGame } from "@/lib/chess/useChessGame";
import { MoveStripH } from "@/components/chess/MoveStripH";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { FamousGame } from "@/lib/games/famous";

const ChessBoard = dynamic(
  () => import("@/components/chess/ChessBoard").then((m) => m.ChessBoard),
  { ssr: false },
);

/**
 * Replay di una partita indimenticabile: scacchiera in sola lettura,
 * striscia mosse, navigazione (anche da tastiera) e commento che segue
 * il cursore. Il commento mostrato è il più recente tra quelli definiti
 * fino alla semimossa corrente, così il contesto resta visibile anche
 * sulle mosse non annotate.
 */
export function FamousGameViewer({ game }: { game: FamousGame }) {
  const t = useTranslations("famous");
  const replay = useChessGame();
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    if (replay.loadPgn(game.pgn)) replay.first();
  }, [replay, game.pgn]);

  const { cursor, history, next, prev, first, last } = replay;
  const total = history.length;
  const atStart = cursor < 0;
  const atEnd = cursor >= total - 1;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && /^(input|textarea|select)$/i.test(e.target.tagName)) return;
      if (e.key === "ArrowRight") { e.preventDefault(); next(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
      else if (e.key === "Home") { e.preventDefault(); first(); }
      else if (e.key === "End") { e.preventDefault(); last(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, first, last]);

  const shapes: DrawShape[] =
    replay.lastMove != null
      ? [{ orig: replay.lastMove[0], dest: replay.lastMove[1], brush: "green" }]
      : [];

  const annotation = useMemo(() => {
    if (cursor < 0) return game.intro;
    for (let i = cursor; i >= 0; i--) {
      const a = game.annotations[i];
      if (a) return a;
    }
    return game.intro;
  }, [cursor, game]);

  const currentSan =
    cursor >= 0
      ? `${Math.ceil((cursor + 1) / 2)}${cursor % 2 === 0 ? "." : "…"} ${history[cursor].san}`
      : null;

  return (
    <div className="lg:grid lg:gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] 2xl:grid-cols-[auto_20rem] 2xl:justify-center">
      <div className="board-sized mx-auto w-full max-w-xl space-y-3 lg:max-w-none">
        <ChessBoard
          fen={replay.fen}
          orientation="white"
          mode="view"
          lastMove={replay.lastMove}
          check={replay.isCheck}
          shapes={shapes}
        />
        {total > 0 && (
          <MoveStripH history={history} cursor={cursor} onSelect={replay.goTo} />
        )}
        <div className="flex items-center justify-between gap-3">
          <Button variant="secondary" size="sm" onClick={prev} disabled={atStart}>
            ← {t("viewer.back")}
          </Button>
          <span className="font-mono text-sm text-text-muted">
            {atStart
              ? t("viewer.start")
              : t("viewer.move", { n: Math.ceil((cursor + 1) / 2) })}{" "}
            {total > 0 && `/ ${Math.ceil(total / 2)}`}
          </span>
          <Button size="sm" onClick={next} disabled={atEnd}>
            {t("viewer.next")} →
          </Button>
        </div>
      </div>

      <aside className="mt-6 space-y-4 lg:mt-0">
        <Card>
          <CardContent className="space-y-3 py-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-display text-lg font-medium">{game.title}</p>
                <p className="text-sm text-text-muted">
                  {game.white} – {game.black}
                </p>
                <p className="text-sm text-text-muted">{game.event}</p>
              </div>
              <Badge variant="outline" className="shrink-0 font-mono">
                {game.result}
              </Badge>
            </div>
            {game.eco && (
              <p className="font-mono text-xs text-text-muted">{game.eco}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-2 py-4">
            {currentSan && (
              <p className="font-mono text-sm font-medium">{currentSan}</p>
            )}
            <p className="text-sm leading-relaxed text-text-muted">{annotation}</p>
          </CardContent>
        </Card>
        <p className="hidden text-xs text-text-muted lg:block">{t("viewer.keyboardHint")}</p>
      </aside>
    </div>
  );
}
