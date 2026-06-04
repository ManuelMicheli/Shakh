"use client";

import { capturedFromFen, type CapturedPiece } from "@/lib/chess/summary";
import { cn } from "@/lib/utils";

/** Glifi Unicode dei pezzi catturati, per colore del pezzo (non di chi cattura). */
const BLACK_GLYPH: Record<CapturedPiece, string> = {
  p: "♟",
  n: "♞",
  b: "♝",
  r: "♜",
  q: "♛",
};
const WHITE_GLYPH: Record<CapturedPiece, string> = {
  p: "♙",
  n: "♘",
  b: "♗",
  r: "♖",
  q: "♕",
};

/**
 * Mostra, accanto al nome di un giocatore, i pezzi avversari che ha catturato e
 * — se è in vantaggio — il distacco materiale (+N). Aggiornato dalla FEN viva.
 */
export function CapturedMaterial({
  fen,
  color,
  className,
}: {
  fen: string;
  /** Colore del giocatore di cui mostrare le catture. */
  color: "w" | "b";
  className?: string;
}) {
  const { byWhite, byBlack, balance } = capturedFromFen(fen);
  const taken = color === "w" ? byWhite : byBlack;
  const glyphs = color === "w" ? BLACK_GLYPH : WHITE_GLYPH;
  const advantage = color === "w" ? balance : -balance;

  if (taken.length === 0 && advantage <= 0) return null;

  return (
    <span
      className={cn("flex items-center gap-1 text-text-muted", className)}
      aria-label={`Captured material${advantage > 0 ? `, +${advantage}` : ""}`}
    >
      {taken.length > 0 && (
        <span className="font-mono text-sm leading-none tracking-[-0.08em]">
          {taken.map((p) => glyphs[p]).join("")}
        </span>
      )}
      {advantage > 0 && (
        <span className="font-mono text-[0.7rem] font-medium leading-none">+{advantage}</span>
      )}
    </span>
  );
}
