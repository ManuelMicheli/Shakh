"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Chess, type Square, type PieceSymbol } from "chess.js";
import type { DrawShape } from "chessground/draw";
import { useChessGame, type LegalDests } from "@/lib/chess/useChessGame";
import { Button } from "@/components/ui/button";
import type { Puzzle, SolveResult } from "@/lib/tactics/types";

// chessground accede a `window`: la board va caricata solo lato client.
const ChessBoard = dynamic(
  () => import("@/components/chess/ChessBoard").then((m) => m.ChessBoard),
  { ssr: false },
);

export interface PuzzleSolverProps {
  puzzle: Puzzle;
  /** Invocata una sola volta a puzzle risolto. */
  onSolved: (result: SolveResult) => void;
}

type Feedback = null | "right" | "wrong";

const NO_DESTS: LegalDests = new Map();

/** Spezza una mossa UCI ("e2e4", "e7e8q") nei componenti per chess.js. */
function splitUci(uci: string): { from: Square; to: Square; promotion?: PieceSymbol } {
  return {
    from: uci.slice(0, 2) as Square,
    to: uci.slice(2, 4) as Square,
    promotion: uci.length > 4 ? (uci[4] as PieceSymbol) : undefined,
  };
}

/** UCI canonica di una mossa concreta (per il confronto con la soluzione). */
function toUci(from: Square, to: Square, promotion?: PieceSymbol): string {
  return `${from}${to}${promotion ?? ""}`;
}

/** Una mossa dà scacco matto immediato? (unica tolleranza ammessa). */
function givesMate(fen: string, from: Square, to: Square, promotion?: PieceSymbol): boolean {
  try {
    const c = new Chess(fen);
    c.move({ from, to, promotion });
    return c.isCheckmate();
  } catch {
    return false;
  }
}

/**
 * Solver di un singolo puzzle. Riusa `ChessBoard` (mode `puzzle`) e `useChessGame`.
 * Convenzione Lichess: la FEN è prima della 1ª mossa, che viene giocata
 * automaticamente dall'avversario; il solver parte dalla 2ª.
 */
export function PuzzleSolver({ puzzle, onSolved }: PuzzleSolverProps) {
  const game = useChessGame(puzzle.fen);

  // Il lato che deve risolvere è l'opposto di chi gioca la mossa d'innesco.
  const triggerColor: "white" | "black" =
    puzzle.fen.split(" ")[1] === "b" ? "black" : "white";
  const solverColor: "white" | "black" = triggerColor === "white" ? "black" : "white";

  // Indice della prossima mossa della soluzione da giocare (0 = innesco).
  const pointerRef = useRef(0);
  const hadErrorRef = useRef(false);
  const hintedRef = useRef(false);
  const startRef = useRef(0);
  const doneRef = useRef(false);

  const [busy, setBusy] = useState(true); // bloccato finché non parte l'innesco
  const [solved, setSolved] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [shapes, setShapes] = useState<DrawShape[]>([]);

  // Applica una mossa UCI alla partita "vera".
  const applyUci = useCallback(
    (uci: string) => {
      const { from, to, promotion } = splitUci(uci);
      return game.move(from, to, promotion);
    },
    [game],
  );

  // (Ri)inizializza a ogni nuovo puzzle: reset, poi mossa d'innesco animata.
  useEffect(() => {
    pointerRef.current = 0;
    hadErrorRef.current = false;
    hintedRef.current = false;
    doneRef.current = false;
    setSolved(false);
    setFeedback(null);
    setShapes([]);
    setBusy(true);
    game.reset(puzzle.fen);

    const t = setTimeout(() => {
      applyUci(puzzle.moves[0]); // innesco dell'avversario
      pointerRef.current = 1;
      startRef.current = performance.now();
      setBusy(false);
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puzzle.id]);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    setSolved(true);
    setBusy(true);
    setFeedback("right");
    onSolved({
      clean: !hadErrorRef.current,
      hinted: hintedRef.current,
      timeMs: performance.now() - startRef.current,
    });
  }, [onSolved]);

  const flashWrong = useCallback((from: Square, to: Square) => {
    // Cerchi rossi su origine/destinazione: comunica l'errore E, cambiando
    // `shapes`, fa ri-applicare la FEN alla board (riporta indietro il pezzo).
    setShapes([
      { orig: from, brush: "red" },
      { orig: to, brush: "red" },
    ]);
    setFeedback("wrong");
    window.setTimeout(() => {
      setShapes([]);
      setFeedback(null);
    }, 700);
  }, []);

  const handleUserMove = useCallback(
    (from: Square, to: Square, promotion?: PieceSymbol) => {
      if (busy || doneRef.current) return;
      const pointer = pointerRef.current;
      if (pointer <= 0 || pointer >= puzzle.moves.length) return;

      const expected = puzzle.moves[pointer];
      const played = toUci(from, to, promotion);
      const correct =
        played === expected ||
        // Tolleranza: matto immediato equivalente (tipico dei matti).
        givesMate(game.fen, from, to, promotion);

      if (!correct) {
        hadErrorRef.current = true;
        flashWrong(from, to);
        return;
      }

      // Corretta: applica la mossa dell'utente.
      game.move(from, to, promotion);
      const afterUser = pointer + 1;
      pointerRef.current = afterUser;

      if (afterUser >= puzzle.moves.length) {
        finish();
        return;
      }

      // Risposta automatica dell'avversario, poi torna all'utente.
      setBusy(true);
      window.setTimeout(() => {
        applyUci(puzzle.moves[afterUser]);
        const afterReply = afterUser + 1;
        pointerRef.current = afterReply;
        if (afterReply >= puzzle.moves.length) {
          finish();
        } else {
          setBusy(false);
        }
      }, 400);
    },
    [busy, puzzle.moves, game, flashWrong, finish, applyUci],
  );

  const onHint = useCallback(() => {
    if (busy || doneRef.current) return;
    hintedRef.current = true;
    const pointer = pointerRef.current;
    if (pointer <= 0 || pointer >= puzzle.moves.length) return;
    const from = puzzle.moves[pointer].slice(0, 2) as Square;
    setShapes([{ orig: from, brush: "yellow" }]);
  }, [busy, puzzle.moves]);

  // Input permesso solo quando è il turno del solver e non siamo occupati.
  const canMove = !busy && !solved && game.turn === solverColor[0];

  return (
    <div className="space-y-3">
      <div className="relative mx-auto w-full max-w-xl lg:max-w-2xl xl:max-w-4xl">
        <ChessBoard
          fen={game.fen}
          orientation={solverColor}
          mode="puzzle"
          movableColor={solverColor}
          dests={canMove ? game.legalDests : NO_DESTS}
          lastMove={game.lastMove}
          check={game.isCheck}
          shapes={shapes}
          onMove={handleUserMove}
          // Esito mostrato in stile motore: ✓ sulla casella di destinazione quando la
          // mossa è corretta; gli errori restano segnalati dai cerchi rossi (shapes).
          moveGlyph={
            feedback === "right" && game.lastMove
              ? { square: game.lastMove[1], classification: "good" }
              : null
          }
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-text-muted">
          Muove il {solverColor === "white" ? "Bianco" : "Nero"}
        </span>
        <Button variant="ghost" size="sm" onClick={onHint} disabled={busy || solved}>
          Suggerimento
        </Button>
      </div>
    </div>
  );
}
