"use client";

import { useRef, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { ArrowUpToLine, Trash2, Save } from "lucide-react";
import { useMoveTree } from "@/lib/chess/useMoveTree";
import { BoardControls } from "@/components/chess/BoardControls";
import { VariationTree } from "@/components/chess/VariationTree";
import { OpeningExplorer } from "@/components/theory/OpeningExplorer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { saveRepertoire } from "@/app/app/repertorio/actions";
import type { SerializedMoveTree } from "@/lib/chess/moveTree";
import type { PieceColor } from "@/lib/theory/repertoire";

const ChessBoard = dynamic(
  () => import("@/components/chess/ChessBoard").then((m) => m.ChessBoard),
  { ssr: false },
);

export interface RepertoireEditorProps {
  repertoireId: string;
  name: string;
  color: PieceColor;
  tree: SerializedMoveTree;
}

/**
 * Editor del repertorio basato su `useMoveTree`: si aggiungono mosse muovendo
 * sulla board o cliccandole nell'`OpeningExplorer` ("aggiungi al repertorio").
 * Il salvataggio serializza l'albero su `repertoire_moves` (id stabili → SRS).
 */
export function RepertoireEditor({ repertoireId, name, color, tree }: RepertoireEditorProps) {
  const t = useMoveTree(tree);
  const { toast } = useToast();
  const [orientation, setOrientation] = useState<"white" | "black">(color);
  const [dirty, setDirty] = useState(false);
  const [saving, startSave] = useTransition();
  const boardWrapRef = useRef<HTMLDivElement>(null);

  const touch = () => setDirty(true);

  const onSave = () => {
    startSave(async () => {
      const res = await saveRepertoire(repertoireId, t.serialize());
      if (!res.ok) {
        toast({ title: "Save failed", description: res.error, variant: "error" });
        return;
      }
      setDirty(false);
      toast({ title: "Repertoire saved" });
    });
  };

  const annotation = t.currentNode.comment ?? "";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">{name}</h1>
          <p className="mt-1 text-sm text-text-muted">
            {color === "white" ? "White" : "Black"} · build and annotate your lines
          </p>
        </div>
        <Button onClick={onSave} disabled={saving || !dirty}>
          <Save className="mr-1 h-4 w-4" />
          {saving ? "Saving…" : dirty ? "Save" : "Saved"}
        </Button>
      </div>

      <div className="lg:grid lg:gap-6 lg:grid-cols-[minmax(0,1fr)_24rem] 2xl:grid-cols-[auto_24rem] 2xl:justify-center">
        <div className="space-y-3">
          <div
            ref={boardWrapRef}
            tabIndex={0}
            className="board-sized mx-auto w-full max-w-xl rounded-md outline-none focus-visible:ring-2 focus-visible:ring-text lg:max-w-none"
          >
            <ChessBoard
              fen={t.fen}
              orientation={orientation}
              mode="play"
              dests={t.legalDests}
              lastMove={t.lastMove}
              check={t.isCheck}
              shapes={undefined}
              onMove={(from, to, promotion) => {
                t.playMove(from, to, promotion);
                touch();
              }}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <BoardControls
              onFirst={t.first}
              onPrev={t.prev}
              onNext={t.next}
              onLast={t.last}
              onFlip={() => setOrientation((o) => (o === "white" ? "black" : "white"))}
              atStart={t.atStart}
              atEnd={t.atEnd}
              keyboardTarget={boardWrapRef}
            />
            <div className="flex gap-1">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  t.promote(t.currentNodeId);
                  touch();
                }}
                disabled={t.atStart}
                title="Make this the main line"
              >
                <ArrowUpToLine className="mr-1 h-4 w-4" /> Promote
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  t.remove(t.currentNodeId);
                  touch();
                }}
                disabled={t.atStart}
                title="Delete this move and its continuation"
              >
                <Trash2 className="mr-1 h-4 w-4" /> Delete
              </Button>
            </div>
          </div>

          {/* Annotazione del nodo corrente */}
          <Card>
            <CardHeader>
              <CardTitle>Annotation</CardTitle>
            </CardHeader>
            <CardContent>
              {t.atStart ? (
                <p className="text-sm text-text-muted">
                  Select a move to annotate it.
                </p>
              ) : (
                <Input
                  value={annotation}
                  onChange={(e) => {
                    t.annotate(t.currentNodeId, { comment: e.target.value || undefined });
                    touch();
                  }}
                  placeholder="Move idea, plan, trap…"
                />
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Tabs defaultValue="moves">
            <TabsList className="w-full">
              <TabsTrigger value="moves">Lines</TabsTrigger>
              <TabsTrigger value="explorer">Explorer</TabsTrigger>
            </TabsList>

            <TabsContent value="moves">
              <Card>
                <CardContent className="pt-4">
                  <VariationTree
                    tree={t.tree}
                    currentNodeId={t.currentNodeId}
                    onSelect={t.goTo}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="explorer">
              <Card>
                <CardContent className="pt-4">
                  <OpeningExplorer
                    fen={t.fen}
                    onPlayMove={(san) => {
                      t.play(san);
                      touch();
                    }}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
