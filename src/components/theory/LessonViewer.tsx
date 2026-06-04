"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Chess, type Square, type PieceSymbol } from "chess.js";
import { useMoveTree } from "@/lib/chess/useMoveTree";
import { BoardControls } from "@/components/chess/BoardControls";
import { VariationTree } from "@/components/chess/VariationTree";
import { EvalBar } from "@/components/chess/EvalBar";
import { EngineLines } from "@/components/chess/EngineLines";
import { OpeningExplorer } from "@/components/theory/OpeningExplorer";
import { TablebasePanel } from "@/components/theory/TablebasePanel";
import { DeviationCoach } from "@/components/theory/DeviationCoach";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useEngineAnalysis } from "@/lib/engine/useEngineAnalysis";
import { toWhiteRelative, type ScoreType } from "@/lib/engine/score";
import type { Lesson, TheoryType, Shape } from "@/lib/theory/types";
import type { DrawShape } from "chessground/draw";
import { recordLessonCompletion } from "@/app/app/teoria/actions";

const ChessBoard = dynamic(
  () => import("@/components/chess/ChessBoard").then((m) => m.ChessBoard),
  { ssr: false },
);

export interface LessonViewerProps {
  lesson: Lesson;
  type: TheoryType;
  title: string;
  coachConfigured: boolean;
  /** Id del content_item: se presente, completare i passi registra il progresso (07). */
  contentItemId?: string;
}

/** Risolve un SAN nella posizione in una freccia verde (mossa candidata). */
function sanToArrow(fen: string, san: string): Shape | null {
  try {
    const m = new Chess(fen).move(san);
    return { orig: m.from, dest: m.to, brush: "green" };
  } catch {
    return null;
  }
}

/**
 * Viewer di lezione board-driven: mette insieme board + albero + passi guidati +
 * esplorazione libera (motore) + deviazione (coach) + contesto dinamico
 * (explorer per le aperture, tablebase per i finali). Riusabile dai tre rami.
 */
export function LessonViewer({
  lesson,
  type,
  title,
  coachConfigured,
  contentItemId,
}: LessonViewerProps) {
  const tree = useMoveTree(lesson.tree);
  const [orientation, setOrientation] = useState<"white" | "black">("white");
  const [guided, setGuided] = useState(0);
  const [engineOn, setEngineOn] = useState(false);
  const [completed, setCompleted] = useState(false);
  const completionSentRef = useRef(false);
  const boardWrapRef = useRef<HTMLDivElement>(null);

  const { goTo, currentNodeId } = tree;

  // Id dei nodi presenti nella lezione originale: ciò che esce di qui è deviazione.
  const originalIds = useMemo(
    () => new Set(Object.keys(lesson.tree.nodes)),
    [lesson.tree.nodes],
  );

  // Mappa nodeId → indice del passo guidato.
  const stepByNode = useMemo(() => {
    const m = new Map<string, number>();
    lesson.steps.forEach((s, i) => m.set(s.nodeId, i));
    return m;
  }, [lesson.steps]);

  // Posiziona la board sul primo passo all'apertura.
  const mounted = useRef(false);
  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    if (lesson.steps[0]) goTo(lesson.steps[0].nodeId);
  }, [lesson.steps, goTo]);

  const currentStepIndex = stepByNode.get(currentNodeId) ?? null;
  const currentStep = currentStepIndex !== null ? lesson.steps[currentStepIndex] : null;

  const isDeviation = !originalIds.has(currentNodeId) && tree.currentNode.parentId !== null;

  // Raggiunto l'ultimo passo → lezione completata: registra (una sola volta) il
  // completamento per il percorso guidato (07). Idempotente lato server.
  const isLastStep =
    currentStepIndex !== null && currentStepIndex === lesson.steps.length - 1;
  useEffect(() => {
    if (!isLastStep || !contentItemId || completionSentRef.current) return;
    completionSentRef.current = true;
    setCompleted(true);
    void recordLessonCompletion(contentItemId);
  }, [isLastStep, contentItemId]);

  // La deviazione accende il motore per valutare subito.
  useEffect(() => {
    if (isDeviation) setEngineOn(true);
  }, [isDeviation]);

  // Motore (acceso a richiesta o su deviazione).
  const { evaluation } = useEngineAnalysis(tree.fen, {
    enabled: engineOn,
    depth: 18,
    multiPV: 3,
  });

  const whiteEval = useMemo(() => {
    const top = evaluation?.lines[0];
    if (!top) return null;
    return {
      value: toWhiteRelative(top.score, top.scoreType, tree.turn),
      type: top.scoreType as ScoreType,
    };
  }, [evaluation, tree.turn]);

  // Shapes mostrate: quelle del nodo + quelle del passo + frecce delle candidate.
  const shapes = useMemo<DrawShape[]>(() => {
    const list: Shape[] = [];
    if (tree.shapes) list.push(...tree.shapes);
    if (currentStep?.shapes) list.push(...currentStep.shapes);
    for (const san of currentStep?.highlightMoves ?? []) {
      const arrow = sanToArrow(tree.fen, san);
      if (arrow) list.push(arrow);
    }
    return list as unknown as DrawShape[];
  }, [tree.shapes, tree.fen, currentStep]);

  const nextStep = () => {
    const i = Math.min((currentStepIndex ?? guided) + 1, lesson.steps.length - 1);
    setGuided(i);
    goTo(lesson.steps[i].nodeId);
  };
  const prevStep = () => {
    const i = Math.max((currentStepIndex ?? guided) - 1, 0);
    setGuided(i);
    goTo(lesson.steps[i].nodeId);
  };

  const onPlaySan = (san: string) => {
    tree.play(san);
  };

  const deviationParentFen = tree.currentNode.parentId
    ? tree.tree.nodes[tree.currentNode.parentId]?.fen ?? null
    : null;

  const contextTab = type === "opening" ? "explorer" : type === "endgame" ? "tablebase" : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">{title}</h1>
        {lesson.intro && <p className="mt-2 max-w-2xl text-text-muted">{lesson.intro}</p>}
      </div>

      <div className="lg:grid lg:gap-6 lg:grid-cols-[minmax(0,1fr)_24rem] 2xl:grid-cols-[auto_22rem] 2xl:justify-center">
        {/* Board + controlli + passi */}
        <div className="space-y-3">
          <div className="board-sized mx-auto flex w-full max-w-xl gap-2 lg:max-w-none">
            {engineOn && whiteEval && (
              <EvalBar score={whiteEval.value} scoreType={whiteEval.type} orientation={orientation} />
            )}
            <div
              ref={boardWrapRef}
              tabIndex={0}
              className="flex-1 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-text"
            >
              <ChessBoard
                fen={tree.fen}
                orientation={orientation}
                mode="play"
                dests={tree.legalDests}
                lastMove={tree.lastMove}
                check={tree.isCheck}
                shapes={shapes}
                onMove={(from, to, promotion) => tree.playMove(from, to, promotion)}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <BoardControls
              onFirst={tree.first}
              onPrev={tree.prev}
              onNext={tree.next}
              onLast={tree.last}
              onFlip={() => setOrientation((o) => (o === "white" ? "black" : "white"))}
              atStart={tree.atStart}
              atEnd={tree.atEnd}
              keyboardTarget={boardWrapRef}
            />
            <Button
              variant={engineOn ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setEngineOn((v) => !v)}
            >
              Engine {engineOn ? "on" : "off"}
            </Button>
          </div>

          {/* Pannello passi guidati */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  {isDeviation
                    ? "You left the line"
                    : currentStepIndex !== null
                      ? `Step ${currentStepIndex + 1} of ${lesson.steps.length}`
                      : "Free exploration"}
                </CardTitle>
                {lesson.steps.length > 0 && !isDeviation && (
                  <div className="flex gap-1">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={prevStep}
                      disabled={(currentStepIndex ?? guided) <= 0}
                    >
                      ← Back
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={nextStep}
                      disabled={(currentStepIndex ?? guided) >= lesson.steps.length - 1}
                    >
                      Next →
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {isDeviation ? (
                <>
                  <p className="text-sm text-text-muted">
                    You&apos;re exploring a move outside the lesson. Evaluate it with the
                    engine or ask the coach why it isn&apos;t the best choice.
                  </p>
                  {deviationParentFen && tree.currentNode.san && (
                    <DeviationCoach
                      fenBefore={deviationParentFen}
                      deviationSan={tree.currentNode.san}
                      coachConfigured={coachConfigured}
                    />
                  )}
                  <Button variant="ghost" size="sm" onClick={tree.prev}>
                    ← Back to the line
                  </Button>
                </>
              ) : currentStep ? (
                <>
                  <p className="text-sm leading-relaxed">{currentStep.text}</p>
                  {completed && isLastStep && (
                    <p className="text-sm font-medium text-text">
                      ✓ Lesson completed — recorded in your path.
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-text-muted">
                  Navigate the moves or play on the board to explore.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Pannelli laterali (in tab: anche su mobile board sopra, pannelli sotto) */}
        <div>
          <Tabs defaultValue="moves">
            <TabsList className="w-full">
              <TabsTrigger value="moves">Moves</TabsTrigger>
              <TabsTrigger value="engine">Engine</TabsTrigger>
              {contextTab && (
                <TabsTrigger value="context">
                  {type === "opening" ? "Explorer" : "Tablebase"}
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="moves">
              <Card>
                <CardContent className="pt-4">
                  <VariationTree
                    tree={tree.tree}
                    currentNodeId={tree.currentNodeId}
                    onSelect={tree.goTo}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="engine">
              <Card>
                <CardContent className="space-y-3 pt-4">
                  {engineOn ? (
                    evaluation && evaluation.lines.length > 0 ? (
                      <EngineLines
                        fen={tree.fen}
                        lines={evaluation.lines}
                        onSelectMove={(uci, ply) => {
                          if (ply !== 0) return;
                          tree.playMove(
                            uci.slice(0, 2) as Square,
                            uci.slice(2, 4) as Square,
                            (uci[4] as PieceSymbol | undefined) || undefined,
                          );
                        }}
                      />
                    ) : (
                      <p className="text-sm text-text-muted">The engine is thinking…</p>
                    )
                  ) : (
                    <p className="text-sm text-text-muted">
                      Engine off. Turn it on to evaluate the position and deviations.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {contextTab && (
              <TabsContent value="context">
                <Card>
                  <CardContent className="pt-4">
                    {type === "opening" ? (
                      <OpeningExplorer fen={tree.fen} onPlayMove={onPlaySan} />
                    ) : (
                      <TablebasePanel fen={tree.fen} onPlayMove={onPlaySan} />
                    )}
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
