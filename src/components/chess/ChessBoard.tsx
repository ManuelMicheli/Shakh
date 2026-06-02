"use client";

import { useEffect, useRef, useState } from "react";
import { Chessground } from "chessground";
import type { Api } from "chessground/api";
import type { Config } from "chessground/config";
import type { Color, Key } from "chessground/types";
import type { DrawShape } from "chessground/draw";
import type { Square, PieceSymbol } from "chess.js";
import type { LegalDests } from "@/lib/chess/useChessGame";
import { cn } from "@/lib/utils";

import "chessground/assets/chessground.base.css";
import "chessground/assets/chessground.cburnett.css";

type BoardOrientation = "white" | "black";
type BoardMode = "play" | "view" | "puzzle";
type MovableColor = "white" | "black" | "both";

export interface ChessBoardProps {
  /** Posizione da mostrare. */
  fen?: string;
  orientation?: BoardOrientation;
  /**
   * - `play`: l'utente muove liberamente rispettando le mosse legali (`dests`).
   * - `view`: sola lettura, nessun input.
   * - `puzzle`: input permesso, ma le mosse vanno filtrate dall'esterno (per ora come `play`).
   */
  mode?: BoardMode;
  movableColor?: MovableColor;
  /** Mosse legali per la posizione corrente (origine → destinazioni). */
  dests?: LegalDests;
  lastMove?: [Square, Square] | null;
  check?: boolean;
  /** Frecce / cerchi (annotazioni), via l'API `drawable` di chessground. */
  shapes?: DrawShape[];
  /** Chiamata quando l'utente completa una mossa legale (con il pezzo di promozione se serve). */
  onMove?: (from: Square, to: Square, promotion?: PieceSymbol) => void;
  coordinates?: boolean;
  disableAnimation?: boolean;
  className?: string;
}

const PROMOTION_PIECES: { role: PieceSymbol; label: string }[] = [
  { role: "q", label: "Donna" },
  { role: "r", label: "Torre" },
  { role: "b", label: "Alfiere" },
  { role: "n", label: "Cavallo" },
];

const GLYPHS: Record<"white" | "black", Record<PieceSymbol, string>> = {
  white: { q: "♕", r: "♖", b: "♗", n: "♘", k: "♔", p: "♙" },
  black: { q: "♛", r: "♜", b: "♝", n: "♞", k: "♚", p: "♟" },
};

/** Colore attivo a partire dalla FEN ('w' → white). */
function turnFromFen(fen: string): Color {
  return fen.split(" ")[1] === "b" ? "black" : "white";
}

/** Pezzo sulla casella indicata leggendo direttamente la FEN. Lettera minuscola = nero. */
function pieceAt(fen: string, square: Square): { type: PieceSymbol; color: Color } | null {
  const file = square.charCodeAt(0) - 97; // a..h → 0..7
  const rank = 8 - Number(square[1]); // 8..1 → 0..7 (riga 0 = ottava traversa)
  const rows = fen.split(" ")[0].split("/");
  const row = rows[rank];
  if (!row) return null;
  let col = 0;
  for (const ch of row) {
    if (ch >= "1" && ch <= "8") {
      col += Number(ch);
    } else {
      if (col === file) {
        const type = ch.toLowerCase() as PieceSymbol;
        return { type, color: ch === ch.toLowerCase() ? "black" : "white" };
      }
      col += 1;
    }
    if (col > file) break;
  }
  return null;
}

interface PendingPromotion {
  from: Square;
  to: Square;
  color: "white" | "black";
}

const DEFAULT_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export function ChessBoard({
  fen = DEFAULT_FEN,
  orientation = "white",
  mode = "play",
  movableColor,
  dests,
  lastMove,
  check,
  shapes,
  onMove,
  coordinates = true,
  disableAnimation = false,
  className,
}: ChessBoardProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<Api | null>(null);
  const [pending, setPending] = useState<PendingPromotion | null>(null);

  // Ref ai valori più recenti, così i gestori di chessground non si chiudono su stati vecchi.
  const onMoveRef = useRef(onMove);
  const fenRef = useRef(fen);
  const orientationRef = useRef(orientation);
  onMoveRef.current = onMove;
  fenRef.current = fen;
  orientationRef.current = orientation;

  // Inizializzazione (una sola volta): l'istanza chessground non va ricreata a ogni render.
  useEffect(() => {
    if (!wrapRef.current) return;

    const handleAfter = (orig: Key, dest: Key) => {
      const from = orig as Square;
      const to = dest as Square;
      const piece = pieceAt(fenRef.current, from);
      const lastRank = to[1] === "8" || to[1] === "1";

      // Promozione: trattieni la mossa, ripristina la board, mostra il selettore.
      if (piece?.type === "p" && lastRank) {
        apiRef.current?.set({ fen: fenRef.current });
        setPending({ from, to, color: piece.color === "black" ? "black" : "white" });
        return;
      }
      onMoveRef.current?.(from, to);
    };

    apiRef.current = Chessground(wrapRef.current, {
      fen,
      orientation,
      coordinates,
      movable: { free: false, showDests: true, events: { after: handleAfter } },
      drawable: { enabled: true },
    });

    return () => {
      apiRef.current?.destroy();
      apiRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sincronizzazione: a ogni cambio di props rilancia .set() (mai ricreare l'istanza).
  useEffect(() => {
    const api = apiRef.current;
    if (!api) return;
    const viewOnly = mode === "view";
    const config: Config = {
      fen,
      orientation,
      coordinates,
      check: check ?? false,
      lastMove: lastMove ? [lastMove[0] as Key, lastMove[1] as Key] : undefined,
      turnColor: turnFromFen(fen),
      viewOnly,
      animation: { enabled: !disableAnimation },
      movable: {
        free: false,
        color: viewOnly ? undefined : movableColor ?? turnFromFen(fen),
        dests: (dests as Map<Key, Key[]>) ?? new Map(),
        showDests: true,
      },
      drawable: { enabled: true, shapes: shapes ?? [] },
    };
    api.set(config);
  }, [
    fen,
    orientation,
    mode,
    movableColor,
    dests,
    lastMove,
    check,
    shapes,
    coordinates,
    disableAnimation,
  ]);

  const choosePromotion = (role: PieceSymbol) => {
    if (!pending) return;
    const { from, to } = pending;
    setPending(null);
    onMoveRef.current?.(from, to, role);
  };

  const cancelPromotion = () => {
    // Ripristina la posizione precedente (la board era già stata resettata in handleAfter).
    apiRef.current?.set({ fen: fenRef.current });
    setPending(null);
  };

  return (
    <div className={cn("relative aspect-square w-full select-none", className)}>
      <div ref={wrapRef} className="h-full w-full" />

      {pending && (
        <div
          className="absolute inset-0 z-20 flex items-center justify-center bg-bg/70 backdrop-blur-sm"
          onClick={cancelPromotion}
          role="dialog"
          aria-label="Scegli il pezzo di promozione"
        >
          <div
            className="flex gap-2 rounded-lg border border-border bg-surface p-2 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {PROMOTION_PIECES.map(({ role, label }) => (
              <button
                key={role}
                type="button"
                aria-label={label}
                title={label}
                onClick={() => choosePromotion(role)}
                className="flex h-14 w-14 items-center justify-center rounded-md border border-border bg-surface-2 text-4xl leading-none text-text transition-colors hover:bg-text hover:text-bg focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                {GLYPHS[pending.color][role]}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
