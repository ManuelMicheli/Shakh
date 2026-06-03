"use client";

import { useState } from "react";
import {
  Menu,
  Bell,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  MoreVertical,
  Handshake,
  Flag,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * SHOWCASE (dev-only): redesign mobile della pagina partita (scacchiera),
 * direzione editoriale + texture scacchi. Board piena, barre giocatore sopra/
 * sotto, striscia mosse orizzontale, barra controlli in basso. Board e dati finti.
 */

// Posizione finta (dopo 1.e4 e5 2.Nf3 Nc6 3.Bb5) per un'anteprima viva.
const POSITION: (string | null)[] = parseFen(
  "r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R",
);
const LAST_MOVE = ["f1", "b5"]; // alfiere in b5

const MOVES = [
  "e4", "e5", "Nf3", "Nc6", "Bb5", "a6", "Ba4", "Nf6", "O-O", "Be7",
];

export default function GiocaShowcasePage() {
  const [cursor, setCursor] = useState(MOVES.length - 1);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Redesign mobile · Partita
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          Board piena, barre giocatore, mosse a striscia, controlli in basso.
        </p>
      </header>

      <div className="flex justify-center pt-2">
        <PhoneFrame>
          <PhoneChrome />
          <div className="flex flex-1 flex-col overflow-hidden bg-bg">
            {/* Avversario */}
            <div className="px-3 pt-3">
              <PlayerBar
                name="Avversario"
                meta="Nero"
                clock="4:32"
                active
                captured="♟♟♝"
              />
            </div>

            {/* Board piena */}
            <div className="px-3 py-2">
              <MockBoard squares={POSITION} lastMove={LAST_MOVE} />
            </div>

            {/* Io */}
            <div className="px-3">
              <PlayerBar
                name="Tu"
                meta="Bianco"
                clock="5:00"
                active={false}
                captured="♙♙♞"
                you
              />
            </div>

            {/* Striscia mosse orizzontale */}
            <div className="mt-2 px-3">
              <MoveStrip
                moves={MOVES}
                cursor={cursor}
                onSelect={setCursor}
              />
            </div>

            {/* Barra controlli in basso */}
            <ControlBar
              cursor={cursor}
              max={MOVES.length - 1}
              onFirst={() => setCursor(-1)}
              onPrev={() => setCursor((c) => Math.max(-1, c - 1))}
              onNext={() => setCursor((c) => Math.min(MOVES.length - 1, c + 1))}
              onLast={() => setCursor(MOVES.length - 1)}
            />
          </div>
        </PhoneFrame>
      </div>
    </div>
  );
}

/* ---- Barra giocatore: glifo + nome + meta + orologio ---- */
function PlayerBar({
  name,
  meta,
  clock,
  active,
  captured,
  you = false,
}: {
  name: string;
  meta: string;
  clock: string;
  active: boolean;
  captured: string;
  you?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-2 font-display text-lg leading-none">
        {you ? "♙" : "♟"}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{name}</span>
          <span className="text-[10px] uppercase tracking-wide text-text-muted">
            {meta}
          </span>
        </div>
        <span className="font-mono text-xs tracking-wide text-text-muted">
          {captured}
        </span>
      </div>
      <div
        className={cn(
          "rounded-lg px-3 py-1.5 font-mono text-xl tabular-nums",
          active
            ? "bg-text text-bg"
            : "bg-surface-2 text-text",
        )}
      >
        {clock}
      </div>
    </div>
  );
}

/* ---- Striscia mosse orizzontale, coppie numerate ---- */
function MoveStrip({
  moves,
  cursor,
  onSelect,
}: {
  moves: string[];
  cursor: number;
  onSelect: (i: number) => void;
}) {
  return (
    <div className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-surface px-2 py-1.5">
      {Array.from({ length: Math.ceil(moves.length / 2) }).map((_, p) => {
        const wi = p * 2;
        const bi = p * 2 + 1;
        return (
          <div key={p} className="flex shrink-0 items-center gap-1">
            <span className="font-mono text-[11px] text-text-muted/60">
              {p + 1}.
            </span>
            <MoveChip
              san={moves[wi]}
              active={cursor === wi}
              onClick={() => onSelect(wi)}
            />
            {moves[bi] && (
              <MoveChip
                san={moves[bi]}
                active={cursor === bi}
                onClick={() => onSelect(bi)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function MoveChip({
  san,
  active,
  onClick,
}: {
  san: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded px-1.5 py-0.5 font-mono text-xs tabular-nums transition-colors",
        active ? "bg-text text-bg" : "text-text hover:bg-surface-2",
      )}
    >
      {san}
    </button>
  );
}

/* ---- Barra controlli in basso ---- */
function ControlBar({
  cursor,
  max,
  onFirst,
  onPrev,
  onNext,
  onLast,
}: {
  cursor: number;
  max: number;
  onFirst: () => void;
  onPrev: () => void;
  onNext: () => void;
  onLast: () => void;
}) {
  const [menu, setMenu] = useState(false);
  const btn =
    "grid h-11 flex-1 place-items-center rounded-lg bg-surface-2 text-text disabled:opacity-40";
  return (
    <div className="relative mt-auto flex items-center gap-2 border-t border-border bg-surface px-3 py-3">
      <button className={btn} onClick={onFirst} disabled={cursor < 0} aria-label="Inizio">
        <ChevronsLeft className="h-5 w-5" />
      </button>
      <button className={btn} onClick={onPrev} disabled={cursor < 0} aria-label="Indietro">
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button className={btn} onClick={onNext} disabled={cursor >= max} aria-label="Avanti">
        <ChevronRight className="h-5 w-5" />
      </button>
      <button className={btn} onClick={onLast} disabled={cursor >= max} aria-label="Fine">
        <ChevronsRight className="h-5 w-5" />
      </button>
      <div className="relative">
        <button
          className="grid h-11 w-11 place-items-center rounded-lg bg-surface-2 text-text"
          onClick={() => setMenu((v) => !v)}
          aria-label="Azioni"
        >
          <MoreVertical className="h-5 w-5" />
        </button>
        {menu && (
          <div className="absolute bottom-full right-0 z-50 mb-2 w-44 space-y-1 rounded-lg border border-border bg-surface p-1 shadow-lg">
            <button className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-sm hover:bg-surface-2">
              <Handshake className="h-4 w-4" /> Proponi patta
            </button>
            <button className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-sm text-eval-blunder hover:bg-surface-2">
              <Flag className="h-4 w-4" /> Abbandona
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   Mock board — caselle bianco/grigio come il tema reale,
   pezzi unicode tinti per colore. Solo anteprima.
   ============================================================ */
function MockBoard({
  squares,
  lastMove,
}: {
  squares: (string | null)[];
  lastMove: string[];
}) {
  return (
    <div className="mx-auto aspect-square w-full overflow-hidden rounded border border-border">
      <div className="grid h-full w-full grid-cols-8 grid-rows-8">
        {squares.map((piece, i) => {
          const file = i % 8;
          const rank = 8 - Math.floor(i / 8);
          const sq = "abcdefgh"[file] + rank;
          const dark = (file + Math.floor(i / 8)) % 2 === 1;
          const isLast = lastMove.includes(sq);
          return (
            <div
              key={i}
              className="relative flex items-center justify-center"
              style={{ backgroundColor: dark ? "#8b8b8b" : "#ffffff" }}
            >
              {isLast && (
                <span
                  aria-hidden
                  className="absolute inset-0"
                  style={{ backgroundColor: "rgba(24,24,24,0.16)" }}
                />
              )}
              {piece && <Piece code={piece} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Piece({ code }: { code: string }) {
  const white = code === code.toUpperCase();
  const glyph = GLYPH[code.toLowerCase()];
  return (
    <span
      className="relative select-none leading-none"
      style={{
        fontSize: "min(7vw, 1.9rem)",
        color: white ? "#fafafa" : "#1a1a1a",
        textShadow: white
          ? "0 0 1px #1a1a1a, 0 1px 1px rgba(0,0,0,.4)"
          : "0 0 1px rgba(255,255,255,.5)",
      }}
    >
      {glyph}
    </span>
  );
}

const GLYPH: Record<string, string> = {
  k: "♚",
  q: "♛",
  r: "♜",
  b: "♝",
  n: "♞",
  p: "♟",
};

/** FEN board-part → array 64 (rank8→rank1), maiuscolo = bianco. */
function parseFen(board: string): (string | null)[] {
  const out: (string | null)[] = [];
  for (const row of board.split("/")) {
    for (const ch of row) {
      if (/\d/.test(ch)) {
        for (let k = 0; k < Number(ch); k++) out.push(null);
      } else {
        out.push(ch);
      }
    }
  }
  return out;
}

/* ---- Cornice telefono ---- */
function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative w-[390px] max-w-full shrink-0 rounded-[2.5rem] border border-border bg-surface p-2 shadow-2xl">
      <div className="relative flex h-[760px] flex-col overflow-hidden rounded-[2rem] border border-border">
        <div className="pointer-events-none absolute left-1/2 top-0 z-20 h-6 w-32 -translate-x-1/2 rounded-b-2xl bg-surface" />
        {children}
      </div>
    </div>
  );
}

function PhoneChrome() {
  return (
    <div className="shrink-0">
      <div className="flex h-14 items-center justify-between bg-surface px-4 pt-2">
        <button type="button" aria-label="Menu" className="-ml-1 rounded-md p-1.5 text-text-muted">
          <Menu className="h-5 w-5" />
        </button>
        <span className="font-display text-lg font-semibold tracking-tight">Shakh</span>
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Notifiche" className="rounded-md p-1.5 text-text-muted">
            <Bell className="h-5 w-5" />
          </button>
          <div className="grid h-8 w-8 place-items-center rounded-full bg-text text-xs font-semibold text-bg">
            M
          </div>
        </div>
      </div>
      <div className="chess-rule h-1 w-full" />
    </div>
  );
}
