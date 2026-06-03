"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Chess, type Square, type PieceSymbol } from "chess.js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { getCalcPuzzle, recordCalcResult } from "@/app/app/calcolo/actions";
import type { Puzzle } from "@/lib/tactics/types";

const ChessBoard = dynamic(
  () => import("@/components/chess/ChessBoard").then((m) => m.ChessBoard),
  { ssr: false },
);

type Color = "white" | "black";
type Phase = "idle" | "preview" | "solve" | "result";

const MIN_DEPTH = 2;
const MAX_DEPTH = 5;

/** Mosse dell'utente nella soluzione (1ª mossa = innesco avversario). */
function userMovesOf(moves: string[]): number {
  return Math.floor(moves.length / 2);
}

function splitUci(uci: string): { from: Square; to: Square; promotion?: PieceSymbol } {
  return {
    from: uci.slice(0, 2) as Square,
    to: uci.slice(2, 4) as Square,
    promotion: uci.length > 4 ? (uci[4] as PieceSymbol) : undefined,
  };
}

/** Matto immediato: unica tolleranza ammessa rispetto alla soluzione canonica. */
function givesMate(fen: string, from: Square, to: Square, promotion?: PieceSymbol): boolean {
  try {
    const c = new Chess(fen);
    c.move({ from, to, promotion });
    return c.isCheckmate();
  } catch {
    return false;
  }
}

export interface CalculationTrainerProps {
  initialPuzzle: Puzzle | null;
  initialRating: number | null;
}

export function CalculationTrainer({ initialPuzzle, initialRating }: CalculationTrainerProps) {
  const { toast } = useToast();

  const [phase, setPhase] = useState<Phase>("idle");
  const [puzzle, setPuzzle] = useState<Puzzle | null>(initialPuzzle);
  const [loading, setLoading] = useState(false);
  const [rating] = useState<number | null>(initialRating);

  const [orientation, setOrientation] = useState<Color>("white");
  const [previewLeft, setPreviewLeft] = useState(0);
  const [selectedFrom, setSelectedFrom] = useState<Square | null>(null);
  const [movesDone, setMovesDone] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [result, setResult] = useState<{ solved: boolean; reached: number; total: number } | null>(
    null,
  );

  const chessRef = useRef<Chess | null>(null);
  const pointerRef = useRef(0);
  const previewFenRef = useRef("");
  const totalRef = useRef(0);
  const depthRef = useRef(MIN_DEPTH);
  const seenRef = useRef<Set<string>>(new Set(initialPuzzle ? [initialPuzzle.id] : []));

  // ----- Avvio di un puzzle: applica l'innesco, mostra l'anteprima -----
  const setup = useCallback((p: Puzzle) => {
    const c = new Chess(p.fen);
    c.move(splitUci(p.moves[0])); // innesco dell'avversario (visibile in anteprima)
    chessRef.current = c;
    pointerRef.current = 1;
    previewFenRef.current = c.fen();
    totalRef.current = userMovesOf(p.moves);

    const color: Color = c.turn() === "w" ? "white" : "black";
    setOrientation(color);
    setSelectedFrom(null);
    setMovesDone(0);
    setMessage(null);
    setResult(null);
    setPreviewLeft(3 + totalRef.current); // più profonda → più tempo d'anteprima
    setPhase("preview");
  }, []);

  // Countdown dell'anteprima.
  useEffect(() => {
    if (phase !== "preview") return;
    if (previewLeft <= 0) {
      setPhase("solve");
      return;
    }
    const id = window.setTimeout(() => setPreviewLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [phase, previewLeft]);

  // ----- Conclusione (successo o fallimento) -----
  const finish = useCallback(
    async (solved: boolean, reached: number) => {
      const total = totalRef.current;
      setResult({ solved, reached, total });
      setPhase("result");
      if (!puzzle) return;
      const res = await recordCalcResult({
        puzzleId: puzzle.id,
        puzzleRating: puzzle.rating,
        userMoves: total,
        solved,
      });
      if (!res.ok && res.error) {
        toast({ title: "Rating non aggiornato", description: res.error, variant: "error" });
      }
      // Scala di difficoltà per il prossimo.
      depthRef.current = solved
        ? Math.min(MAX_DEPTH, depthRef.current + 1)
        : Math.max(MIN_DEPTH, depthRef.current - 1);
    },
    [puzzle, toast],
  );

  // ----- Tentativo di mossa (alla cieca) -----
  const attempt = useCallback(
    (from: Square, to: Square) => {
      const c = chessRef.current;
      if (!c || !puzzle) return;
      const pointer = pointerRef.current;
      const piece = c.get(from);
      const promotion: PieceSymbol | undefined =
        piece?.type === "p" && (to[1] === "8" || to[1] === "1") ? "q" : undefined;
      const playedUci = `${from}${to}${promotion ?? ""}`;
      const expected = puzzle.moves[pointer];

      const correct = playedUci === expected || givesMate(c.fen(), from, to, promotion);
      setSelectedFrom(null);

      if (!correct) {
        setMessage("Mossa sbagliata. Calcolo interrotto.");
        void finish(false, movesDone);
        return;
      }

      // Applica la mossa dell'utente.
      c.move({ from, to, promotion });
      const doneNow = movesDone + 1;
      setMovesDone(doneNow);
      let ptr = pointer + 1;

      if (ptr >= puzzle.moves.length) {
        setMessage(null);
        void finish(true, doneNow);
        return;
      }

      // Risposta forzata dell'avversario (applicata, mostrata solo come testo).
      const reply = c.move(splitUci(puzzle.moves[ptr]));
      ptr += 1;
      pointerRef.current = ptr;

      if (ptr >= puzzle.moves.length) {
        setMessage(null);
        void finish(true, doneNow);
        return;
      }
      setMessage(reply ? `L'avversario gioca ${reply.san}` : null);
    },
    [puzzle, movesDone, finish],
  );

  const onSquare = useCallback(
    (sq: Square) => {
      if (phase !== "solve") return;
      setSelectedFrom((cur) => {
        if (cur === null) return sq;
        if (cur === sq) return null;
        attempt(cur, sq);
        return null;
      });
    },
    [phase, attempt],
  );

  // ----- Prossimo puzzle -----
  const loadNext = useCallback(async () => {
    setLoading(true);
    const next = await getCalcPuzzle({
      targetDepth: depthRef.current,
      excludeIds: Array.from(seenRef.current),
    });
    setLoading(false);
    if (!next) {
      setPuzzle(null);
      setPhase("idle");
      return;
    }
    seenRef.current.add(next.id);
    setPuzzle(next);
    setup(next);
  }, [setup]);

  // ----- Reveal finale: posizione dopo tutta la soluzione -----
  const revealFen = (() => {
    if (!puzzle) return undefined;
    try {
      const c = new Chess(puzzle.fen);
      for (const m of puzzle.moves) c.move(splitUci(m));
      return c.fen();
    } catch {
      return previewFenRef.current;
    }
  })();

  // ============================================================
  // Render
  // ============================================================

  if (!puzzle) {
    return (
      <Shell rating={rating}>
        <Card>
          <CardHeader>
            <CardTitle>Nessun esercizio disponibile</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-text-muted">
              Nessun puzzle adatto trovato. Importa il dataset dei puzzle o riprova più tardi.
            </p>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  const total = totalRef.current || userMovesOf(puzzle.moves);

  return (
    <Shell rating={rating}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="space-y-3">
          {phase === "idle" && (
            <Card>
              <CardHeader>
                <CardTitle>Calcolo alla cieca</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-text-muted">
                  Memorizza la posizione, poi la scacchiera si svuota: gioca l&apos;intera
                  combinazione <strong>a memoria</strong>, senza vedere i pezzi. L&apos;avversario
                  risponde nella tua testa — te lo confermiamo solo a parole.
                </p>
                <Button onClick={() => setup(puzzle)}>Inizia</Button>
              </CardContent>
            </Card>
          )}

          {phase === "preview" && (
            <div className="mx-auto w-full max-w-xl space-y-3 lg:max-w-none">
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-muted">
                  Muove il {orientation === "white" ? "Bianco" : "Nero"} · {total} mosse da calcolare
                </span>
                <span className="font-mono text-sm">memorizza: {previewLeft}s</span>
              </div>
              <ChessBoard fen={previewFenRef.current} orientation={orientation} mode="view" />
              <Button onClick={() => setPhase("solve")} className="w-full">
                Sono pronto — nascondi
              </Button>
            </div>
          )}

          {phase === "solve" && (
            <div className="mx-auto w-full max-w-xl space-y-3 lg:max-w-none">
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-muted">
                  Muove il {orientation === "white" ? "Bianco" : "Nero"}
                </span>
                <span className="font-mono text-sm">
                  mossa {Math.min(movesDone + 1, total)} di {total}
                </span>
              </div>
              <BlindGrid orientation={orientation} selected={selectedFrom} onSquare={onSquare} />
              <div className="flex min-h-6 items-center justify-between gap-3">
                <span className="text-sm text-text-muted">{message ?? "Gioca la tua mossa"}</span>
                <Button variant="ghost" size="sm" onClick={() => void finish(false, movesDone)}>
                  Arrenditi
                </Button>
              </div>
            </div>
          )}

          {phase === "result" && result && (
            <div className="mx-auto w-full max-w-xl space-y-3 lg:max-w-none">
              <ChessBoard fen={revealFen} orientation={orientation} mode="view" />
              <Card>
                <CardContent className="space-y-3 py-4">
                  <p className="font-medium">
                    {result.solved
                      ? `Risolto — ${result.total} mosse calcolate alla cieca.`
                      : `Arrivato a ${result.reached}/${result.total} mosse.`}
                  </p>
                  <div className="flex gap-2">
                    <Button onClick={() => void loadNext()} disabled={loading}>
                      {loading ? "…" : "Prossimo"}
                    </Button>
                    <Link href="/app/calcolo">
                      <Button variant="secondary">Esci</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <Stat label="Rating calcolo" value={rating ?? "—"} />
          <Stat label="Profondità" value={`${depthRef.current} mosse`} />
          <p className="text-xs text-text-muted">
            La profondità sale quando risolvi, scende quando sbagli.
          </p>
        </aside>
      </div>
    </Shell>
  );
}

/** Griglia 8×8 senza pezzi: solo coordinate. Selezione a due tocchi (origine → destinazione). */
function BlindGrid({
  orientation,
  selected,
  onSquare,
}: {
  orientation: Color;
  selected: Square | null;
  onSquare: (sq: Square) => void;
}) {
  const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
  const ranks = ["8", "7", "6", "5", "4", "3", "2", "1"];
  const fileOrder = orientation === "white" ? files : [...files].reverse();
  const rankOrder = orientation === "white" ? ranks : [...ranks].reverse();

  return (
    <div className="mx-auto grid aspect-square w-full max-w-xl grid-cols-8 overflow-hidden rounded-md border border-border lg:max-w-none">
      {rankOrder.map((r, ri) =>
        fileOrder.map((f, fi) => {
          const sq = `${f}${r}` as Square;
          const dark = (ri + fi) % 2 === 1;
          const isSel = selected === sq;
          return (
            <button
              key={sq}
              type="button"
              onClick={() => onSquare(sq)}
              className={cn(
                "relative flex items-center justify-center font-mono text-[0.6rem] transition-colors",
                dark ? "bg-surface-2" : "bg-surface",
                isSel && "ring-2 ring-inset ring-text",
              )}
              style={{ color: "var(--text-muted)" }}
            >
              {sq}
            </button>
          );
        }),
      )}
    </div>
  );
}

function Shell({ rating, children }: { rating: number | null; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-end justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Calcolo</h1>
        <div className="text-right">
          <div className="font-mono text-2xl tabular-nums">{rating ?? "—"}</div>
          <div className="text-xs uppercase tracking-wide text-text-muted">rating calcolo</div>
        </div>
      </div>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="text-xs uppercase tracking-wide text-text-muted">{label}</div>
      <div className="mt-1 font-mono text-2xl">{value}</div>
    </div>
  );
}
