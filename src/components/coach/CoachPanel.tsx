"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { CLASSIFICATION_META } from "@/lib/analysis/labels";
import { MoveBadge } from "@/components/analysis/MoveBadge";
import { generateKeyErrorComments } from "@/app/app/partite/actions";
import type { AnalysisRow, Classification } from "@/lib/games/types";
import { PositionChat } from "./PositionChat";

export interface CoachPanelProps {
  gameId: string;
  analyzed: boolean;
  coachConfigured: boolean;
  analysis: AnalysisRow[];
  /** Semimosso mostrato (cursor + 1), null se alla posizione iniziale. */
  currentPly: number | null;
  currentSan: string | null;
  currentClassification: Classification | null;
  fen: string;
  turn: "w" | "b";
}

export function CoachPanel(props: CoachPanelProps) {
  const {
    gameId,
    analyzed,
    coachConfigured,
    analysis,
    currentPly,
    currentSan,
    currentClassification,
    fen,
    turn,
  } = props;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">Coach</CardTitle>
      </CardHeader>
      <CardContent>
        {!coachConfigured ? (
          <p className="text-sm text-text-muted">
            The AI coach isn&apos;t configured (<code className="font-mono">ANTHROPIC_API_KEY</code> is missing).
          </p>
        ) : (
          <Tabs defaultValue="move">
            <TabsList>
              <TabsTrigger value="move">Move</TabsTrigger>
              <TabsTrigger value="chat">Questions</TabsTrigger>
            </TabsList>
            <TabsContent value="move">
              <MoveExplain
                gameId={gameId}
                analyzed={analyzed}
                analysis={analysis}
                currentPly={currentPly}
                currentSan={currentSan}
                currentClassification={currentClassification}
              />
            </TabsContent>
            <TabsContent value="chat">
              <PositionChat fen={fen} turn={turn} />
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}

function MoveExplain({
  gameId,
  analyzed,
  analysis,
  currentPly,
  currentSan,
  currentClassification,
}: {
  gameId: string;
  analyzed: boolean;
  analysis: AnalysisRow[];
  currentPly: number | null;
  currentSan: string | null;
  currentClassification: Classification | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [batching, startBatch] = useTransition();
  // Commenti generati in streaming nella sessione corrente (ply → testo).
  const [localComments, setLocalComments] = useState<Map<number, string>>(new Map());
  const [streamingPly, setStreamingPly] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Commenti già persistiti su DB (arrivano dalle props analysis).
  const savedByPly = useMemo(() => {
    const m = new Map<number, string>();
    analysis.forEach((r) => {
      if (typeof r.ai_comment === "string" && r.ai_comment.trim()) m.set(r.ply, r.ai_comment);
    });
    return m;
  }, [analysis]);

  if (!analyzed) {
    return (
      <p className="text-sm text-text-muted">
        Analyze the game first with the engine: the coach explains the data the engine computes.
      </p>
    );
  }

  if (currentPly == null) {
    return (
      <p className="text-sm text-text-muted">
        Select a move to have it explained.
      </p>
    );
  }

  const comment = localComments.get(currentPly) ?? savedByPly.get(currentPly) ?? null;
  const isStreaming = streamingPly === currentPly;
  const meta = currentClassification ? CLASSIFICATION_META[currentClassification] : null;

  const explain = async (ply: number) => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setStreamingPly(ply);
    setLocalComments((prev) => new Map(prev).set(ply, ""));
    try {
      const res = await fetch("/api/coach/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId, ply }),
        signal: ac.signal,
      });
      if (!res.ok || !res.body) {
        const msg = await res.text().catch(() => "Coach error.");
        toast({ title: "Explanation failed", description: msg, variant: "error" });
        setStreamingPly(null);
        return;
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        setLocalComments((prev) => new Map(prev).set(ply, acc));
      }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) {
        toast({ title: "Explanation failed", variant: "error" });
      }
    } finally {
      setStreamingPly((p) => (p === ply ? null : p));
    }
  };

  const onBatch = () => {
    startBatch(async () => {
      const res = await generateKeyErrorComments(gameId);
      if (!res.ok) {
        toast({ title: "Generation interrupted", description: res.error, variant: "error" });
      } else {
        toast({
          title: res.generated
            ? `Generated ${res.generated} comments`
            : "No new errors to comment on",
          variant: "success",
        });
      }
      router.refresh();
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm">
          Move <span className="font-mono">{currentSan ?? "—"}</span>
          {meta && currentClassification && (
            <span className="ml-2 inline-flex items-center gap-1 align-middle font-medium">
              <MoveBadge classification={currentClassification} size={15} />
              <span style={{ color: meta.color }}>{meta.label}</span>
            </span>
          )}
        </span>
        <Button variant="ghost" size="sm" onClick={onBatch} disabled={batching}>
          {batching ? "…" : "Explain errors"}
        </Button>
      </div>

      {comment ? (
        <p className="whitespace-pre-wrap text-sm leading-relaxed">
          {comment}
          {isStreaming && <span className="ml-1 animate-pulse">▍</span>}
        </p>
      ) : isStreaming ? (
        <p className="flex items-center gap-2 text-sm text-text-muted">
          <Spinner /> The coach is writing…
        </p>
      ) : (
        <Button variant="secondary" size="sm" onClick={() => explain(currentPly)}>
          Explain this move
        </Button>
      )}

      <p className="text-xs text-text-muted">
        Explanations are based on the engine&apos;s data (evaluations and best move), they don&apos;t recompute it.
      </p>
    </div>
  );
}
