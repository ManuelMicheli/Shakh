"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useChessGame } from "@/lib/chess/useChessGame";
import { MoveList } from "@/components/chess/MoveList";
import { BoardControls } from "@/components/chess/BoardControls";
import { EvalBar } from "@/components/chess/EvalBar";
import { EvalGraph, type EvalPoint } from "@/components/chess/EvalGraph";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { AnalyzeRunner } from "./AnalyzeRunner";
import { CoachPanel } from "@/components/coach/CoachPanel";
import { Tooltip } from "@/components/ui/tooltip";
import { decodeEval, toWhiteCpClamped, type PovEval } from "@/lib/analysis/evalScore";
import { formatEval } from "@/lib/engine/score";
import { evalVerdict } from "@/lib/engine/explain";
import { CLASSIFICATION_META } from "@/lib/analysis/labels";
import { summarizeGame, type SideSummary } from "@/lib/analysis/accuracy";
import { resetGameAnalysis } from "@/app/app/partite/actions";
import type { AnalysisRow, Classification, PieceColor } from "@/lib/games/types";

const ChessBoard = dynamic(
  () => import("@/components/chess/ChessBoard").then((m) => m.ChessBoard),
  { ssr: false },
);

export interface GameReviewProps {
  game: {
    id: string;
    pgn: string;
    white: string | null;
    black: string | null;
    result: string | null;
    userColor: PieceColor | null;
    analyzed: boolean;
  };
  analysis: AnalysisRow[];
  coachConfigured: boolean;
}

const EVAL_CAP = 1000;

export function GameReview({ game, analysis, coachConfigured }: GameReviewProps) {
  const chess = useChessGame();
  const router = useRouter();
  const { toast } = useToast();
  const [orientation, setOrientation] = useState<"white" | "black">(
    game.userColor === "black" ? "black" : "white",
  );
  const [resetting, startReset] = useTransition();
  const boardWrapRef = useRef<HTMLDivElement>(null);
  const loadedRef = useRef(false);

  // Carica il PGN una sola volta, partendo dalla posizione iniziale.
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    chess.loadPgn(game.pgn);
    chess.goTo(-1);
  }, [chess, game.pgn]);

  // Indici → classificazione (chiave = indice mossa = ply − 1).
  const byPly = useMemo(() => {
    const m = new Map<number, AnalysisRow>();
    analysis.forEach((r) => m.set(r.ply, r));
    return m;
  }, [analysis]);

  const classifications = useMemo(() => {
    const m = new Map<number, Classification>();
    analysis.forEach((r) => {
      if (r.classification) m.set(r.ply - 1, r.classification);
    });
    return m;
  }, [analysis]);

  // Valutazione white-relative della posizione MOSTRATA (segue il cursore).
  const shownEval: PovEval | null = useMemo(() => {
    if (analysis.length === 0) return null;
    if (chess.cursor < 0) {
      const first = byPly.get(1);
      return first?.eval_before != null ? decodeEval(first.eval_before) : null;
    }
    const row = byPly.get(chess.cursor + 1);
    return row?.eval_after != null ? decodeEval(row.eval_after) : null;
  }, [analysis.length, byPly, chess.cursor]);

  // Punti del grafico: posizione iniziale + dopo ogni mossa.
  const graphPoints: EvalPoint[] = useMemo(() => {
    if (analysis.length === 0) return [];
    const pts: EvalPoint[] = [];
    const first = byPly.get(1);
    if (first?.eval_before != null) {
      pts.push({ cursor: -1, cp: toWhiteCpClamped(decodeEval(first.eval_before), EVAL_CAP), classification: null });
    }
    analysis.forEach((r) => {
      if (r.eval_after != null) {
        pts.push({
          cursor: r.ply - 1,
          cp: toWhiteCpClamped(decodeEval(r.eval_after), EVAL_CAP),
          classification: r.classification,
        });
      }
    });
    return pts;
  }, [analysis, byPly]);

  const summary = useMemo(() => summarizeGame(analysis), [analysis]);

  // Info sulla mossa attualmente mostrata (se analizzata).
  const currentRow = chess.cursor >= 0 ? byPly.get(chess.cursor + 1) : null;

  const onReanalyze = () => {
    startReset(async () => {
      const res = await resetGameAnalysis(game.id);
      if (!res.ok) {
        toast({ title: "Operazione non riuscita", description: res.error, variant: "error" });
        return;
      }
      router.refresh();
    });
  };

  const title = `${game.white ?? "?"} – ${game.black ?? "?"}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">{title}</h1>
          {game.result && (
            <p className="mt-1 font-mono text-sm text-text-muted">{game.result}</p>
          )}
        </div>
        {game.analyzed && (
          <Button variant="secondary" size="sm" onClick={onReanalyze} disabled={resetting}>
            {resetting ? "…" : "Rianalizza"}
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        {/* Scacchiera + controlli */}
        <div className="space-y-3">
          <div className="mx-auto flex w-full max-w-3xl gap-2 xl:max-w-[820px]">
            {shownEval && (
              <EvalBar
                score={shownEval.value}
                scoreType={shownEval.type}
                orientation={orientation}
              />
            )}
            <div
              ref={boardWrapRef}
              tabIndex={0}
              className="flex-1 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-text"
            >
              <ChessBoard
                fen={chess.fen}
                orientation={orientation}
                mode="view"
                lastMove={chess.lastMove}
                check={chess.isCheck}
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <BoardControls
              onFirst={chess.first}
              onPrev={chess.prev}
              onNext={chess.next}
              onLast={chess.last}
              onFlip={() => setOrientation((o) => (o === "white" ? "black" : "white"))}
              atStart={chess.cursor < 0}
              atEnd={chess.cursor >= chess.history.length - 1}
              keyboardTarget={boardWrapRef}
            />
            {currentRow && (
              <CurrentMoveInfo row={currentRow} />
            )}
          </div>

          {game.analyzed && graphPoints.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Andamento</CardTitle>
              </CardHeader>
              <CardContent>
                <EvalGraph
                  points={graphPoints}
                  cursor={chess.cursor}
                  onSelect={chess.goTo}
                  cap={EVAL_CAP}
                />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Pannello laterale */}
        <div className="space-y-4">
          {!game.analyzed && (
            <AnalyzeRunner gameId={game.id} pgn={game.pgn} title={title} />
          )}

          <Card>
            <CardHeader>
              <CardTitle>Mosse</CardTitle>
            </CardHeader>
            <CardContent>
              <MoveList
                history={chess.history}
                cursor={chess.cursor}
                onSelect={chess.goTo}
                classifications={game.analyzed ? classifications : undefined}
                className="max-h-72"
              />
            </CardContent>
          </Card>

          <CoachPanel
            gameId={game.id}
            analyzed={game.analyzed}
            coachConfigured={coachConfigured}
            analysis={analysis}
            currentPly={chess.cursor >= 0 ? chess.cursor + 1 : null}
            currentSan={currentRow?.san ?? null}
            currentClassification={currentRow?.classification ?? null}
            fen={chess.fen}
            turn={chess.turn}
          />

          {game.analyzed && (
            <>
              <AnalysisLegend />
              <Card>
                <CardHeader>
                  <CardTitle>Riepilogo</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <SummaryTable white={summary.white} black={summary.black} />
                  <p className="text-xs text-text-muted">
                    L&apos;accuratezza % è una stima basata sulla perdita media in
                    centipawn, non lo standard ufficiale di Lichess/Chess.com.
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** Etichetta della mossa mostrata: classificazione + miglior mossa + valutazione. */
function CurrentMoveInfo({ row }: { row: AnalysisRow }) {
  const meta = row.classification ? CLASSIFICATION_META[row.classification] : null;
  const decoded = row.eval_after != null ? decodeEval(row.eval_after) : null;
  const evalLabel = decoded ? formatEval(decoded.value, decoded.type) : null;
  const verdict = decoded ? evalVerdict(decoded.value, decoded.type) : null;
  return (
    <div className="flex items-center gap-3 text-sm">
      {meta && (
        <Tooltip content={meta.description} className="max-w-xs whitespace-normal">
          <span className="cursor-help font-medium" style={{ color: meta.color }}>
            {meta.glyph} {meta.label}
          </span>
        </Tooltip>
      )}
      {evalLabel && verdict && (
        <Tooltip
          content={`${verdict.headline}. ${verdict.detail}`}
          className="max-w-xs whitespace-normal"
        >
          <span className="cursor-help font-mono text-text-muted">{evalLabel}</span>
        </Tooltip>
      )}
    </div>
  );
}

/** Mini-guida pieghevole su come leggere i simboli dell'analisi. */
function AnalysisLegend() {
  return (
    <details className="rounded-md border border-border bg-surface px-3 py-2 text-sm">
      <summary className="cursor-pointer font-medium text-text">
        Come leggere l&apos;analisi
      </summary>
      <div className="mt-3 space-y-2.5">
        <p className="text-xs leading-snug text-text-muted">
          La <span className="font-medium text-text">barra</span> e il numero in pedoni
          dicono chi sta meglio: valori col <span className="font-mono">+</span> favoriscono
          il Bianco, col <span className="font-mono">−</span> il Nero. Ogni mossa è
          etichettata così:
        </p>
        <ul className="space-y-1.5">
          {(
            ["brilliant", "best", "good", "inaccuracy", "mistake", "blunder", "book"] as const
          ).map((k) => {
            const m = CLASSIFICATION_META[k];
            return (
              <li key={k} className="flex items-baseline gap-2 text-xs">
                <span
                  className="min-w-[5.5rem] shrink-0 font-medium"
                  style={{ color: m.color }}
                >
                  {m.glyph && <span className="font-mono">{m.glyph} </span>}
                  {m.label}
                </span>
                <span className="text-text-muted">{m.description}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </details>
  );
}

function SummaryTable({ white, black }: { white: SideSummary; black: SideSummary }) {
  const rows: { label: string; w: string | number; b: string | number }[] = [
    { label: "Accuratezza", w: `${white.accuracy}%`, b: `${black.accuracy}%` },
    { label: "Imprecisioni", w: white.inaccuracy, b: black.inaccuracy },
    { label: "Errori", w: white.mistake, b: black.mistake },
    { label: "Gravi errori", w: white.blunder, b: black.blunder },
  ];
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-text-muted">
          <th className="text-left font-normal" />
          <th className="px-2 py-1 text-right font-normal">Bianco</th>
          <th className="px-2 py-1 text-right font-normal">Nero</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.label} className="border-t border-border">
            <td className="py-1.5 text-text-muted">{r.label}</td>
            <td className="px-2 py-1.5 text-right font-mono">{r.w}</td>
            <td className="px-2 py-1.5 text-right font-mono">{r.b}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
