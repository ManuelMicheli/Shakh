"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  /**
   * Glifo di qualità mossa (stile motore): un piccolo badge ancorato all'angolo
   * della casella di destinazione, invece di una scritta sopra la scacchiera.
   */
  moveGlyph?: MoveGlyph | null;
  className?: string;
}

export interface MoveGlyph {
  /** Casella su cui ancorare il badge (di norma la destinazione della mossa). */
  square: Square;
  /** Simbolo NAG: "!!", "!", "✓", "?!", "?", "??". */
  glyph: string;
  /** Colore di sfondo (token semantico `--eval-*`). */
  color: string;
}

/** Posizione (in % della board) dell'angolo in alto a destra di una casella. */
function glyphCorner(square: Square, orientation: BoardOrientation): { left: number; top: number } {
  const file = square.charCodeAt(0) - 97; // a..h → 0..7
  const rank = Number(square[1]); // 1..8
  const col = orientation === "white" ? file : 7 - file;
  const row = orientation === "white" ? 8 - rank : rank - 1;
  return { left: (col + 1) * 12.5, top: row * 12.5 };
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

/**
 * Parità visiva di un `<square>` di chessground dal suo `transform: translate(...)`.
 * Ritorna 0 = casella chiara (bianca), 1 = casella scura (grigia). null se illeggibile.
 * La casella in alto a sinistra (col 0, riga 0) è chiara (a8 con orient. bianco); la
 * parità visiva coincide con quella reale anche con board capovolta (rotazione 180°).
 */
function squareParity(el: HTMLElement, step: number): 0 | 1 | null {
  const t = el.style.transform || "";
  const m = t.match(/translate\(\s*(-?[\d.]+)(px|%)?\s*,\s*(-?[\d.]+)(px|%)?/);
  if (!m) return null;
  const x = parseFloat(m[1]);
  const y = parseFloat(m[3]);
  const unit = m[2] || "px";
  const col = unit === "%" ? Math.round(x / 12.5) : Math.round(x / step);
  const row = unit === "%" ? Math.round(y / 12.5) : Math.round(y / step);
  return ((col + row) & 1) as 0 | 1;
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
  moveGlyph,
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
      // Coordinate disegnate da noi FUORI dalla scacchiera (vedi render): quelle
      // interne di chessground si confondono coi pezzi e con le caselle.
      coordinates: false,
      movable: { free: false, showDests: true, events: { after: handleAfter } },
      drawable: { enabled: true },
    });

    // Ricalcolo forzato dopo il primo layout: se chessground monta prima che il
    // quadrato abbia una dimensione misurata (CSS del chunk dinamico non ancora
    // applicato, container non ancora dimensionato), memoizza bounds 0×0 e i pezzi
    // si accatastano in alto a sinistra (translate 0,0). Senza un resize non si
    // correggono da soli: forziamo il ridisegno su più tick (doppio rAF + timeout).
    let raf1 = 0;
    let raf2 = 0;
    const redraw = () => apiRef.current?.redrawAll();
    raf1 = requestAnimationFrame(() => {
      redraw();
      raf2 = requestAnimationFrame(redraw);
    });
    const tid = setTimeout(redraw, 150);

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      clearTimeout(tid);
      apiRef.current?.destroy();
      apiRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resize affidabile: il CSS dimensiona, l'observer fa solo ridisegnare chessground
  // (pezzi/coordinate riallineati) quando il quadrato cambia misura. Throttle via rAF.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    let raf = 0;
    const observer = new ResizeObserver(() => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        apiRef.current?.redrawAll();
      });
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // Colora i punti di destinazione in base al colore della casella: dot grigio su
  // casella bianca (.dest-light), dot bianco su casella grigia (.dest-dark). chessground
  // non marca la parità delle caselle, quindi la calcoliamo dal transform del <square>.
  const tagDests = useCallback(() => {
    const cgBoard = wrapRef.current?.querySelector("cg-board");
    if (!cgBoard) return;
    const step = (cgBoard as HTMLElement).getBoundingClientRect().width / 8;
    if (!step) return;
    cgBoard.querySelectorAll<HTMLElement>("square.move-dest").forEach((sq) => {
      const p = squareParity(sq, step);
      if (p === null) return;
      // toggle con force: se la classe è già corretta non tocca l'attributo (niente
      // mutazione → l'observer non ricicla all'infinito).
      sq.classList.toggle("dest-dark", p === 1);
      sq.classList.toggle("dest-light", p === 0);
    });
  }, []);

  // chessground ridisegna i .move-dest quando l'utente seleziona un pezzo (non passa
  // dal nostro .set()), quindi osserviamo il sottoalbero e ri-taggiamo, con throttle rAF.
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || typeof MutationObserver === "undefined") return;
    let raf = 0;
    const schedule = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        tagDests();
      });
    };
    const observer = new MutationObserver(schedule);
    observer.observe(wrap, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style"],
    });
    schedule();
    return () => {
      observer.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [tagDests]);

  // Sincronizzazione: a ogni cambio di props rilancia .set() (mai ricreare l'istanza).
  useEffect(() => {
    const api = apiRef.current;
    if (!api) return;
    const viewOnly = mode === "view";
    const config: Config = {
      fen,
      orientation,
      coordinates: false,
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
    tagDests();
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
    tagDests,
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

  const board = (
    <div className={cn("board-square relative select-none", className)}>
      {/* Host di chessground: riempie esplicitamente il quadrato. Senza dimensione
          esplicita, .cg-wrap{height:100%} si risolve su un'altezza auto e collassa
          → bounds 0×0 → pezzi accatastati in alto a sinistra (translate 0,0). */}
      <div ref={wrapRef} className="absolute inset-0" />

      {moveGlyph && moveGlyph.glyph && (
        <div className="board-glyph-layer" aria-hidden="true">
          {(() => {
            const { left, top } = glyphCorner(moveGlyph.square, orientation);
            return (
              <span
                className="board-glyph"
                style={{ left: `${left}%`, top: `${top}%`, backgroundColor: moveGlyph.color }}
              >
                {moveGlyph.glyph}
              </span>
            );
          })()}
        </div>
      )}

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

  if (!coordinates) return board;

  // Coordinate FUORI dalla scacchiera: numeri (traverse) a sinistra, lettere
  // (colonne) sotto. L'ordine segue l'orientamento della board.
  const ranks = orientation === "white"
    ? [8, 7, 6, 5, 4, 3, 2, 1]
    : [1, 2, 3, 4, 5, 6, 7, 8];
  const files = orientation === "white"
    ? ["a", "b", "c", "d", "e", "f", "g", "h"]
    : ["h", "g", "f", "e", "d", "c", "b", "a"];

  return (
    <div className="board-frame">
      <div className="board-ranks" aria-hidden="true">
        {ranks.map((r) => (
          <span key={r}>{r}</span>
        ))}
      </div>
      {board}
      <div className="board-files" aria-hidden="true">
        {files.map((f) => (
          <span key={f}>{f}</span>
        ))}
      </div>
    </div>
  );
}
