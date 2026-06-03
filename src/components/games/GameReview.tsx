"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useChessGame } from "@/lib/chess/useChessGame";
import { MoveList } from "@/components/chess/MoveList";
import { BoardControls } from "@/components/chess/BoardControls";
import { EvalBar } from "@/components/chess/EvalBar";
import { EvalGraph, type EvalPoint } from "@/components/chess/EvalGraph";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { AnalyzeRunner } from "./AnalyzeRunner";
import { CoachPanel } from "@/components/coach/CoachPanel";
import { Tooltip } from "@/components/ui/tooltip";
import { decodeEval, toWhiteCpClamped, type PovEval } from "@/lib/analysis/evalScore";
import { formatEval } from "@/lib/engine/score";
import { evalVerdict } from "@/lib/engine/explain";
import { CLASSIFICATION_META } from "@/lib/analysis/labels";
import { MoveBadge } from "@/components/analysis/MoveBadge";
import { summarizeGame, type SideSummary } from "@/lib/analysis/accuracy";
import { resetGameAnalysis } from "@/app/app/partite/actions";
import { CLASSIFICATION_ORDER, type AnalysisRow, type Classification, type PieceColor } from "@/lib/games/types";

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

  // Badge di qualità (solo il simbolo NAG) ancorato all'angolo in alto a destra
  // della casella di destinazione della mossa mostrata.
  const moveGlyph = useMemo(() => {
    if (!game.analyzed || !currentRow?.classification || !chess.lastMove) return null;
    const meta = CLASSIFICATION_META[currentRow.classification];
    if (!meta.marked) return null;
    return { square: chess.lastMove[1], classification: currentRow.classification };
  }, [game.analyzed, currentRow, chess.lastMove]);

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

  // Chi sta in basso = colore dell'orientamento della board; in alto l'avversario.
  const bottomColor = orientation;
  const topColor: "white" | "black" = orientation === "white" ? "black" : "white";
  const nameOf = (c: "white" | "black") => (c === "white" ? game.white : game.black);

  return (
    <div className="flex flex-col gap-3 lg:h-[calc(100dvh-6.5rem)] lg:overflow-hidden">
      {/* Header compatto (non scrolla). */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h1 className="font-display text-xl font-semibold tracking-tight">Analisi partita</h1>
          {game.result && (
            <span className="font-mono text-xs text-text-muted">{game.result}</span>
          )}
        </div>
        {game.analyzed && (
          <div className="flex gap-2">
            <Link href={`/app/reel/${game.id}`}>
              <Button variant="secondary" size="sm">
                Crea reel
              </Button>
            </Link>
            <Button variant="secondary" size="sm" onClick={onReanalyze} disabled={resetting}>
              {resetting ? "…" : "Rianalizza"}
            </Button>
          </div>
        )}
      </div>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] 2xl:grid-cols-[auto_22rem] 2xl:justify-center">
        {/* Scacchiera + controlli: si auto-dimensiona per stare in pagina. */}
        <div className="board-sized analysis-board flex min-h-0 flex-col gap-2">
          {/* Controlli avanti/indietro in ALTO, sopra la scacchiera. */}
          <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 xl:max-w-[820px] 2xl:max-w-[980px]">
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
            {currentRow && <CurrentMoveInfo row={currentRow} />}
          </div>

          {/* Nome del giocatore in alto (avversario rispetto all'orientamento). */}
          <PlayerTag name={nameOf(topColor)} color={topColor} indented={Boolean(shownEval)} />

          <div className="mx-auto flex w-full max-w-3xl gap-2 xl:max-w-[820px] 2xl:max-w-[980px]">
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
              className="min-w-0 flex-1 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-text"
            >
              <ChessBoard
                fen={chess.fen}
                orientation={orientation}
                mode="view"
                lastMove={chess.lastMove}
                check={chess.isCheck}
                moveGlyph={moveGlyph}
              />
            </div>
          </div>

          {/* Nome del giocatore in basso (lato dell'orientamento). */}
          <PlayerTag name={nameOf(bottomColor)} color={bottomColor} indented={Boolean(shownEval)} />
        </div>

        {/* Pannello laterale a schede: tutto raggiungibile senza scrollare la pagina. */}
        <div className="flex min-h-0 flex-col gap-3 lg:overflow-hidden">
          {!game.analyzed && (
            <AnalyzeRunner gameId={game.id} pgn={game.pgn} title={title} />
          )}

          <Tabs defaultValue="moves" className="flex min-h-0 flex-1 flex-col">
            <TabsList className="shrink-0 self-start">
              <TabsTrigger value="moves">Mosse</TabsTrigger>
              <TabsTrigger value="coach">Coach</TabsTrigger>
              {game.analyzed && <TabsTrigger value="summary">Riepilogo</TabsTrigger>}
            </TabsList>

            <TabsContent value="moves" className="min-h-0 flex-1 space-y-3 overflow-y-auto">
              {game.analyzed && currentRow && <MoveAnalysisDetails row={currentRow} />}
              <MoveList
                history={chess.history}
                cursor={chess.cursor}
                onSelect={chess.goTo}
                classifications={game.analyzed ? classifications : undefined}
              />
            </TabsContent>

            <TabsContent value="coach" className="min-h-0 flex-1 overflow-y-auto">
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
            </TabsContent>

            {game.analyzed && (
              <TabsContent value="summary" className="min-h-0 flex-1 space-y-4 overflow-y-auto">
                {graphPoints.length > 1 && (
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
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>
    </div>
  );
}

/** Targhetta compatta col nome del giocatore + pallino del suo colore. */
function PlayerTag({
  name,
  color,
  indented,
}: {
  name: string | null;
  color: "white" | "black";
  indented: boolean;
}) {
  return (
    <div className="mx-auto flex w-full max-w-3xl items-center gap-2 xl:max-w-[820px] 2xl:max-w-[980px]">
      {/* Spaziatore largo come la barra di valutazione, così il nome si allinea alla board. */}
      {indented && <div className="w-6 shrink-0" aria-hidden="true" />}
      <span
        className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full border border-border ${
          color === "white" ? "bg-neutral-50" : "bg-neutral-900"
        }`}
        aria-hidden="true"
      />
      <span className="truncate text-sm font-medium text-text">{name ?? "?"}</span>
    </div>
  );
}

/**
 * Valutazione della mossa mostrata. Il simbolo di qualità (!,!!,?! …) NON è qui:
 * vive come badge sull'angolo del pezzo mosso (vedi `moveGlyph` su ChessBoard).
 */
function CurrentMoveInfo({ row }: { row: AnalysisRow }) {
  const decoded = row.eval_after != null ? decodeEval(row.eval_after) : null;
  const evalLabel = decoded ? formatEval(decoded.value, decoded.type) : null;
  const verdict = decoded ? evalVerdict(decoded.value, decoded.type) : null;
  if (!evalLabel || !verdict) return null;
  return (
    <Tooltip
      content={`${verdict.headline}. ${verdict.detail}`}
      className="max-w-xs whitespace-normal"
    >
      <span className="cursor-help font-mono text-sm text-text-muted">{evalLabel}</span>
    </Tooltip>
  );
}

/**
 * Scheda d'analisi della mossa mostrata: SOLO fatti del motore (deterministici,
 * prompt 03) — classificazione, valutazione prima→dopo, mossa migliore. La
 * spiegazione in linguaggio naturale del *perché* resta al coach (prompt 04).
 */
function MoveAnalysisDetails({ row }: { row: AnalysisRow }) {
  const meta = row.classification ? CLASSIFICATION_META[row.classification] : null;

  const before = row.eval_before != null ? decodeEval(row.eval_before) : null;
  const after = row.eval_after != null ? decodeEval(row.eval_after) : null;
  const beforeLabel = before ? formatEval(before.value, before.type) : null;
  const afterLabel = after ? formatEval(after.value, after.type) : null;

  // La mossa giocata era già la migliore? Allora non ripetere la "mossa migliore".
  const playedWasTop =
    row.best_move_san != null && row.best_move_san === row.san;
  const showBest = row.best_move_san != null && !playedWasTop;

  return (
    <div className="space-y-2 rounded-md border border-border bg-surface p-3">
      <div className="flex items-center gap-2">
        <span className="text-sm">
          Mossa <span className="font-mono">{row.san}</span>
        </span>
        {meta && row.classification && (
          <span className="inline-flex items-center gap-1 font-medium">
            <MoveBadge classification={row.classification} size={15} />
            <span style={{ color: meta.color }}>{meta.label}</span>
          </span>
        )}
      </div>

      {beforeLabel && afterLabel && (
        <div className="flex items-center gap-1.5 text-sm">
          <span className="text-text-muted">Valutazione</span>
          <span className="font-mono">{beforeLabel}</span>
          <span aria-hidden="true" className="text-text-muted">
            →
          </span>
          <span className="font-mono">{afterLabel}</span>
        </div>
      )}

      {showBest && (
        <div className="flex items-center gap-1.5 text-sm">
          <span className="text-text-muted">Mossa migliore</span>
          <span className="font-mono" style={{ color: "var(--eval-best)" }}>
            {row.best_move_san}
          </span>
        </div>
      )}

      {meta && (
        <p className="text-xs leading-snug text-text-muted">{meta.description}</p>
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
          {CLASSIFICATION_ORDER.map((k) => {
            const m = CLASSIFICATION_META[k];
            return (
              <li key={k} className="flex items-baseline gap-2 text-xs">
                <span className="flex min-w-[6.5rem] shrink-0 items-center gap-1.5 font-medium">
                  <MoveBadge classification={k} size={15} />
                  <span style={{ color: m.color }}>{m.label}</span>
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
    { label: "Mosse mancate", w: white.miss, b: black.miss },
    { label: "Errori gravi", w: white.blunder, b: black.blunder },
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
