"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { Chess, type Square, type PieceSymbol } from "chess.js";
import {
  Undo2,
  RotateCcw,
  RefreshCw,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  MoreVertical,
} from "lucide-react";
import { useChessGame } from "@/lib/chess/useChessGame";
import { findTimeControl } from "@/lib/play/time-controls";
import { BoardControls } from "@/components/chess/BoardControls";
import { MoveList } from "@/components/chess/MoveList";
import { MoveStripH } from "@/components/chess/MoveStripH";
import { GameClock } from "./GameClock";
import { GameOverOverlay, type GameOutcome } from "./GameOverOverlay";
import { gameStatsFromFen, formatDuration } from "@/lib/chess/summary";
import { CapturedMaterial } from "@/components/chess/CapturedMaterial";
import { useGameBreakdown } from "@/lib/analysis/useGameBreakdown";
import { useAnalyzePlayedGame } from "@/lib/play/useAnalyzePlayedGame";
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
  const t = useTranslations("play");
  const game = useChessGame();
  const [phase, setPhase] = useState<"setup" | "play">("setup");
  const [tcId, setTcId] = useState("10+0");
  const [autoFlip, setAutoFlip] = useState(true);
  const [orientation, setOrientation] = useState<Color>("white");

  const [whiteMs, setWhiteMs] = useState<number | null>(null);
  const [blackMs, setBlackMs] = useState<number | null>(null);
  const [flagged, setFlagged] = useState<null | "w" | "b">(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [overlayOff, setOverlayOff] = useState(false);

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
    setOverlayOff(false);
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

  // Riepilogo qualità mosse a fine partita (analisi motore di entrambi i lati).
  const pgn = useMemo(() => {
    if (!over) return null;
    const c = new Chess();
    for (const m of game.history) {
      try {
        c.move({ from: m.from, to: m.to, promotion: m.promotion });
      } catch {
        /* mossa non ricostruibile: salta */
      }
    }
    return c.pgn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [over, game.history]);
  const breakdown = useGameBreakdown(over, pgn, "both");
  const { analyze, loading: analyzeLoading } = useAnalyzePlayedGame();

  // ---------- Setup ----------
  if (phase === "setup") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("hotseat.setupTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm text-text-muted">
            {t("hotseat.setupDesc")}
          </p>
          <div>
            <div className="mb-2 text-xs uppercase tracking-wide text-text-muted">
              {t("timeControl")}
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
            {t("hotseat.autoFlip")}
          </label>
          <Button onClick={start}>{t("startPlaying")}</Button>
        </CardContent>
      </Card>
    );
  }

  // ---------- Play ----------
  const status = hotseatStatus(game, flagged, t);
  const result = hotseatResult(game, flagged, t);
  // Statistiche finali: base dalla FEN + durata se la partita ha orologio.
  const overStats =
    tc.initialMs != null && whiteMs != null && blackMs != null
      ? [
          ...gameStatsFromFen(game.fen),
          {
            label: t("stat.duration"),
            value: formatDuration(
              tc.initialMs * 2 + tc.incMs * game.history.length - (whiteMs + blackMs),
            ),
          },
        ]
      : gameStatsFromFen(game.fen);
  const topColor: "w" | "b" = orientation === "white" ? "b" : "w";
  const bottomColor: "w" | "b" = orientation === "white" ? "w" : "b";
  const msOf = (c: "w" | "b") => (c === "w" ? whiteMs : blackMs);
  const nameOf = (c: "w" | "b") => (c === "w" ? t("color.white") : t("color.black"));

  const atEnd = game.cursor >= game.history.length - 1;

  return (
    <div className="lg:grid lg:gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] 2xl:grid-cols-[auto_20rem] 2xl:justify-center">
      <div className="board-sized lg:mx-auto lg:w-full lg:max-w-none">
        {/* Board piena su mobile (orologi sopra/sotto). Desktop: stessa colonna. */}
        <div className="space-y-3">
          <GameClock
            name={nameOf(topColor)}
            ms={msOf(topColor)}
            active={!over && game.turn === topColor && atLive}
            material={<CapturedMaterial fen={game.fen} color={topColor} />}
          />
          <div
            ref={boardWrapRef}
            tabIndex={0}
            className="relative rounded-md outline-none focus-visible:ring-2 focus-visible:ring-text"
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
            {result && !overlayOff && (
              <GameOverOverlay
                title={result.title}
                subtitle={result.subtitle}
                checkmate={result.checkmate}
                outcome={result.outcome}
                stats={overStats}
                breakdown={breakdown.groups}
                analyzing={breakdown.loading}
                analyzeLoading={analyzeLoading}
                onAnalyze={
                  pgn
                    ? () => {
                        const res = game.isCheckmate
                          ? game.turn === "w"
                            ? "0-1"
                            : "1-0"
                          : flagged
                            ? flagged === "w"
                              ? "0-1"
                              : "1-0"
                            : "1/2-1/2";
                        analyze({ pgn, white: t("color.white"), black: t("color.black"), result: res, userColor: "w" });
                      }
                    : undefined
                }
                onDismiss={() => setOverlayOff(true)}
                actions={
                  <Button size="sm" className="w-full" onClick={() => setPhase("setup")}>
                    {t("newGame")}
                  </Button>
                }
              />
            )}
          </div>
          <GameClock
            name={nameOf(bottomColor)}
            ms={msOf(bottomColor)}
            active={!over && game.turn === bottomColor && atLive}
            material={<CapturedMaterial fen={game.fen} color={bottomColor} />}
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

        {/* Mobile: striscia mosse orizzontale sotto la scacchiera. */}
        {game.history.length > 0 && (
          <div className="mt-2 lg:hidden">
            <MoveStripH
              history={game.history}
              cursor={game.cursor}
              onSelect={game.goTo}
            />
          </div>
        )}

        {/* Mobile: barra controlli — inizio / indietro / avanti / fine + menu. */}
        <div className="relative mt-2 flex items-center gap-2 lg:hidden">
          <Button
            variant="secondary"
            size="icon"
            className="flex-1"
            onClick={game.first}
            disabled={game.cursor < 0}
            aria-label={t("nav.first")}
          >
            <ChevronsLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="flex-1"
            onClick={game.prev}
            disabled={game.cursor < 0}
            aria-label={t("nav.prev")}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="flex-1"
            onClick={game.next}
            disabled={atEnd}
            aria-label={t("nav.next")}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="flex-1"
            onClick={game.last}
            disabled={atEnd}
            aria-label={t("nav.last")}
          >
            <ChevronsRight className="h-5 w-5" />
          </Button>

          <div className="relative">
            <Button
              variant="secondary"
              size="icon"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={t("nav.gameActions")}
              aria-expanded={menuOpen}
            >
              <MoreVertical className="h-5 w-5" />
            </Button>
            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  aria-hidden
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute bottom-full right-0 z-50 mb-2 w-48 space-y-1 rounded-md border border-border bg-surface p-1 shadow-lg">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setOrientation((o) => (o === "white" ? "black" : "white"));
                    }}
                    className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-sm hover:bg-surface-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    {t("hotseat.flipBoard")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      takeback();
                    }}
                    disabled={game.history.length === 0}
                    className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-sm hover:bg-surface-2 disabled:opacity-50"
                  >
                    <Undo2 className="h-4 w-4" />
                    {t("hotseat.undoMove")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setPhase("setup");
                    }}
                    className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-sm hover:bg-surface-2"
                  >
                    <RotateCcw className="h-4 w-4" />
                    {t("newGame")}
                  </button>
                </div>
              </>
            )}
          </div>
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
            {t("hotseat.undoMove")}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setPhase("setup")}>
            <RotateCcw className="h-4 w-4" />
            {t("newGame")}
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{t("moves")}</CardTitle>
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
  t: PlayTranslator,
): string {
  if (flagged)
    return t("hotseat.status.losesOnTime", {
      side: flagged === "w" ? t("color.white") : t("color.black"),
    });
  if (game.isCheckmate)
    return t("hotseat.status.checkmateWins", {
      side: game.turn === "w" ? t("color.black") : t("color.white"),
    });
  if (game.isStalemate) return t("hotseat.status.stalemate");
  if (game.isDraw) return t("status.draw");
  const side = game.turn === "w" ? t("color.white") : t("color.black");
  return game.isCheck
    ? t("status.checkToMove", { side })
    : t("status.toMove", { side });
}

/** Esito strutturato per la schermata finale (hotseat: due giocatori, nessun "tu"). */
function hotseatResult(
  game: ReturnType<typeof useChessGame>,
  flagged: null | "w" | "b",
  t: PlayTranslator,
): { title: string; subtitle?: string; checkmate: boolean; outcome: GameOutcome } | null {
  if (flagged) {
    const winner = flagged === "w" ? t("color.black") : t("color.white");
    return {
      title: t("result.sideWins", { side: winner }),
      subtitle: t("result.timesUp"),
      checkmate: false,
      outcome: "win",
    };
  }
  if (game.isCheckmate) {
    const winner = game.turn === "w" ? t("color.black") : t("color.white");
    return { title: t("result.sideWins", { side: winner }), checkmate: true, outcome: "win" };
  }
  if (game.isStalemate)
    return { title: t("result.draw"), subtitle: t("result.stalemate"), checkmate: false, outcome: "draw" };
  if (game.isDraw) return { title: t("result.draw"), checkmate: false, outcome: "draw" };
  return null;
}

/** Tipo del traduttore next-intl per il namespace "play", per i helper non-componenti. */
type PlayTranslator = ReturnType<typeof useTranslations<"play">>;
