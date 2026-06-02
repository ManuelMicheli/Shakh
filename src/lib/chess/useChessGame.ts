"use client";

import { useCallback, useMemo, useState } from "react";
import { Chess, type Square, type PieceSymbol } from "chess.js";

/**
 * Una mossa nella storia lineare della partita.
 * `fen` è la posizione RISULTANTE dalla mossa; `ply` è il numero di
 * semimossa 1-based (1 = prima mossa del bianco).
 */
export interface HistoryMove {
  san: string;
  from: Square;
  to: Square;
  promotion?: PieceSymbol;
  fen: string;
  ply: number;
}

/** Mosse legali nel formato che chessground si aspetta: origine → destinazioni. */
export type LegalDests = Map<Square, Square[]>;

export interface ChessGame {
  /** FEN della posizione attualmente VISUALIZZATA (dipende dal cursore). */
  fen: string;
  /** Turno nella posizione visualizzata. */
  turn: "w" | "b";
  /** Storia lineare completa della partita. */
  history: HistoryMove[];
  /** Indice della mossa visualizzata: -1 = posizione iniziale, altrimenti 0..history.length-1. */
  cursor: number;
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  isDraw: boolean;
  isGameOver: boolean;
  /** `[from, to]` dell'ultima mossa rispetto alla posizione visualizzata, per l'evidenziazione. */
  lastMove: [Square, Square] | null;
  /** Mosse legali nella posizione visualizzata. */
  legalDests: LegalDests;

  /** Tenta una mossa. Ritorna true se legale. Tronca la storia se si muove dopo aver navigato indietro. */
  move: (from: Square, to: Square, promotion?: PieceSymbol) => boolean;
  goTo: (cursor: number) => void;
  next: () => void;
  prev: () => void;
  first: () => void;
  last: () => void;
  /** Ricarica da una FEN (default: posizione iniziale). Ritorna false se la FEN è invalida. */
  reset: (fen?: string) => boolean;
  /** Carica una partita completa da PGN. Ritorna false se il PGN è invalido. */
  loadPgn: (pgn: string) => boolean;
  /** Esporta la partita corrente (linea completa) in PGN. */
  getPgn: () => string;
}

const DEFAULT_FEN = new Chess().fen();

function buildDests(chess: Chess): LegalDests {
  const dests: LegalDests = new Map();
  for (const m of chess.moves({ verbose: true })) {
    const list = dests.get(m.from);
    if (list) list.push(m.to);
    else dests.set(m.from, [m.to]);
  }
  return dests;
}

interface InternalState {
  startFen: string;
  moves: HistoryMove[];
  cursor: number;
}

/**
 * Cervello di una partita, indipendente dalla UI. `chess.js` è l'unica fonte di
 * verità sulle regole. La storia è lineare ma `HistoryMove`/`cursor` sono pensati
 * per estendersi a un albero di varianti (prompt 06) senza riscrivere l'hook.
 */
export function useChessGame(initialFen: string = DEFAULT_FEN): ChessGame {
  const [state, setState] = useState<InternalState>(() => ({
    startFen: initialFen,
    moves: [],
    cursor: -1,
  }));

  const { startFen, moves, cursor } = state;

  // FEN della posizione visualizzata (ricostruita dal cursore senza mutare la storia).
  const fen = cursor < 0 ? startFen : moves[cursor].fen;

  // Una istanza Chess "di vista" sulla posizione corrente: per flag + mosse legali.
  const view = useMemo(() => new Chess(fen), [fen]);

  const legalDests = useMemo(() => buildDests(view), [view]);

  const lastMove: [Square, Square] | null =
    cursor >= 0 ? [moves[cursor].from, moves[cursor].to] : null;

  const move = useCallback(
    (from: Square, to: Square, promotion?: PieceSymbol): boolean => {
      let ok = false;
      setState((prev) => {
        const baseFen =
          prev.cursor < 0 ? prev.startFen : prev.moves[prev.cursor].fen;
        const chess = new Chess(baseFen);
        try {
          const m = chess.move({ from, to, promotion });
          // Muovere dopo aver navigato indietro tronca la storia da qui.
          const kept = prev.moves.slice(0, prev.cursor + 1);
          const entry: HistoryMove = {
            san: m.san,
            from: m.from,
            to: m.to,
            promotion: m.promotion,
            fen: m.after,
            ply: prev.cursor + 2,
          };
          ok = true;
          return {
            startFen: prev.startFen,
            moves: [...kept, entry],
            cursor: prev.cursor + 1,
          };
        } catch {
          ok = false;
          return prev;
        }
      });
      return ok;
    },
    [],
  );

  const goTo = useCallback((next: number) => {
    setState((prev) => {
      const clamped = Math.max(-1, Math.min(next, prev.moves.length - 1));
      return clamped === prev.cursor ? prev : { ...prev, cursor: clamped };
    });
  }, []);

  const next = useCallback(() => goTo(cursor + 1), [goTo, cursor]);
  const prev = useCallback(() => goTo(cursor - 1), [goTo, cursor]);
  const first = useCallback(() => goTo(-1), [goTo]);
  const last = useCallback(() => goTo(moves.length - 1), [goTo, moves.length]);

  const reset = useCallback((nextFen: string = DEFAULT_FEN): boolean => {
    try {
      // Valida la FEN: il costruttore lancia se invalida.
      const fenToUse = new Chess(nextFen).fen();
      setState({ startFen: fenToUse, moves: [], cursor: -1 });
      return true;
    } catch {
      return false;
    }
  }, []);

  const loadPgn = useCallback((pgn: string): boolean => {
    try {
      const chess = new Chess();
      chess.loadPgn(pgn);
      const verbose = chess.history({ verbose: true });
      const start = verbose.length > 0 ? verbose[0].before : chess.fen();
      const loaded: HistoryMove[] = verbose.map((m, i) => ({
        san: m.san,
        from: m.from,
        to: m.to,
        promotion: m.promotion,
        fen: m.after,
        ply: i + 1,
      }));
      setState({
        startFen: start,
        moves: loaded,
        cursor: loaded.length - 1,
      });
      return true;
    } catch {
      return false;
    }
  }, []);

  const getPgn = useCallback((): string => {
    const chess = new Chess(startFen);
    for (const m of moves) {
      chess.move({ from: m.from, to: m.to, promotion: m.promotion });
    }
    return chess.pgn();
  }, [startFen, moves]);

  return {
    fen,
    turn: view.turn(),
    history: moves,
    cursor,
    isCheck: view.isCheck(),
    isCheckmate: view.isCheckmate(),
    isStalemate: view.isStalemate(),
    isDraw: view.isDraw(),
    isGameOver: view.isGameOver(),
    lastMove,
    legalDests,
    move,
    goTo,
    next,
    prev,
    first,
    last,
    reset,
    loadPgn,
    getPgn,
  };
}
