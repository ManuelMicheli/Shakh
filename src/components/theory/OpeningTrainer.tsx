"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Chess, type Square, type PieceSymbol } from "chess.js";
import { OpeningExplorer } from "@/components/theory/OpeningExplorer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fetchOpeningExplorer, moveGames } from "@/lib/theory/explorer";
import { recordRepertoireAttempt } from "@/app/app/repertorio/actions";
import type { SerializedMoveTree, MoveNode } from "@/lib/chess/moveTree";
import type { LegalDests } from "@/lib/chess/useChessGame";
import type { PieceColor } from "@/lib/theory/repertoire";

const ChessBoard = dynamic(
  () => import("@/components/chess/ChessBoard").then((m) => m.ChessBoard),
  { ssr: false },
);

/** Trappola nota collegata a una posizione del repertorio (rimando 06d). */
export interface TrapWarning {
  fen: string;
  name: string;
  slug: string;
}

export interface OpeningTrainerProps {
  repertoireId: string;
  name: string;
  color: PieceColor;
  tree: SerializedMoveTree;
  dueIds: string[];
  reviewMode: boolean;
  /** Trappole note che combaciano con posizioni del repertorio. */
  trapWarnings?: TrapWarning[];
}

type Phase = "user" | "opponent" | "end";
type Feedback = { type: "ok" | "wrong"; text: string } | null;

function turnOf(fen: string): "w" | "b" {
  return fen.split(" ")[1] === "b" ? "b" : "w";
}

/** Chiave-posizione robusta: pezzi + tratto + arrocco + en-passant. */
function posKey(fen: string): string {
  return fen.split(" ").slice(0, 4).join(" ");
}

export function OpeningTrainer({
  repertoireId,
  name,
  color,
  tree,
  dueIds,
  reviewMode,
  trapWarnings = [],
}: OpeningTrainerProps) {
  const nodes = tree.nodes;
  const rootId = tree.rootId;
  const userTurn = color === "white" ? "w" : "b";
  const dueSet = useMemo(() => new Set(dueIds), [dueIds]);
  const boardWrapRef = useRef<HTMLDivElement>(null);

  // Trappole note indicizzate per posizione (rimando al modulo Trappole, 06d).
  const trapByPos = useMemo(() => {
    const m = new Map<string, { name: string; slug: string }>();
    for (const w of trapWarnings) m.set(posKey(w.fen), { name: w.name, slug: w.slug });
    return m;
  }, [trapWarnings]);

  const [currentId, setCurrentId] = useState(rootId);
  const [phase, setPhase] = useState<Phase>("user");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [stats, setStats] = useState({ correct: 0, wrong: 0 });
  const [lineNote, setLineNote] = useState<string | null>(null);
  // Mossa di deviazione avversaria fuori repertorio (FEN da mostrare nell'explorer).
  const [outOfBookFen, setOutOfBookFen] = useState<string | null>(null);

  const node = nodes[currentId];
  const fen = node?.fen ?? nodes[rootId].fen;
  const lastMove: [Square, Square] | null =
    node?.uci && node.uci.length >= 4
      ? [node.uci.slice(0, 2) as Square, node.uci.slice(2, 4) as Square]
      : null;
  const currentTrap = trapByPos.get(posKey(fen));

  /** Un nodo ha un discendente "in scadenza" (per orientare il ripasso). */
  const subtreeHasDue = useCallback(
    (id: string): boolean => {
      const stack = [id];
      while (stack.length) {
        const cur = stack.pop()!;
        if (dueSet.has(cur)) return true;
        const n = nodes[cur];
        if (n) stack.push(...n.children);
      }
      return false;
    },
    [nodes, dueSet],
  );

  /** Determina la fase quando cambia il nodo corrente. */
  const computePhase = useCallback(
    (id: string): Phase => {
      const n = nodes[id];
      if (!n) return "end";
      if (n.children.length === 0) return "end"; // foglia: linea finita
      return turnOf(n.fen) === userTurn ? "user" : "opponent";
    },
    [nodes, userTurn],
  );

  // All'avvio: scegli una linea (in ripasso, orientata agli item in scadenza).
  const startLine = useCallback(() => {
    setFeedback(null);
    setLineNote(null);
    setOutOfBookFen(null);
    setCurrentId(rootId);
    setPhase(computePhase(rootId));
  }, [rootId, computePhase]);

  useEffect(() => {
    startLine();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Turno avversario: gioca automaticamente (repertorio, altrimenti explorer).
  useEffect(() => {
    if (phase !== "opponent") return;
    const n = nodes[currentId];
    if (!n) return;
    let cancelled = false;

    const pickChild = (): string => {
      const kids = n.children;
      if (reviewMode) {
        const towardDue = kids.filter((c) => subtreeHasDue(c));
        if (towardDue.length > 0) return towardDue[Math.floor(Math.random() * towardDue.length)];
      }
      return kids[Math.floor(Math.random() * kids.length)];
    };

    const timer = setTimeout(async () => {
      if (cancelled) return;
      if (n.children.length > 0) {
        const childId = pickChild();
        setCurrentId(childId);
        setPhase(computePhase(childId));
        return;
      }
      // Nessuna risposta modellata: pesca dall'explorer ciò che si gioca davvero.
      const res = await fetchOpeningExplorer(n.fen, "masters");
      if (cancelled) return;
      if (res.ok && res.data.moves.length > 0) {
        const top = [...res.data.moves].sort((a, b) => moveGames(b) - moveGames(a))[0];
        setLineNote(
          `The opponent left your repertoire with ${top.san} (the most common move). Consider adding it.`,
        );
        setOutOfBookFen(n.fen);
      } else {
        setLineNote("End of the line covered by the repertoire.");
      }
      setPhase("end");
    }, 450);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [phase, currentId, nodes, reviewMode, subtreeHasDue, computePhase]);

  // Mosse legali per l'input utente (solo nella fase 'user').
  const dests: LegalDests | undefined = useMemo(() => {
    if (phase !== "user") return undefined;
    const map: LegalDests = new Map();
    for (const m of new Chess(fen).moves({ verbose: true })) {
      const list = map.get(m.from);
      if (list) list.push(m.to);
      else map.set(m.from, [m.to]);
    }
    return map;
  }, [phase, fen]);

  const expectedChildren = (n: MoveNode): MoveNode[] =>
    n.children.map((c) => nodes[c]).filter(Boolean);

  const onUserMove = (from: Square, to: Square, promotion?: PieceSymbol) => {
    const n = nodes[currentId];
    if (!n || phase !== "user") return;
    let san: string;
    try {
      san = new Chess(n.fen).move({ from, to, promotion }).san;
    } catch {
      return;
    }
    const children = expectedChildren(n);
    const match = children.find((c) => c.san === san);

    if (match) {
      setFeedback({ type: "ok", text: `${san} — correct.` });
      setStats((s) => ({ ...s, correct: s.correct + 1 }));
      void recordRepertoireAttempt(repertoireId, match.id, true);
      const nextId = match.id;
      setCurrentId(nextId);
      setPhase(computePhase(nextId));
    } else {
      // Errato: l'item atteso è la mainline; segnalo, mostro la mossa giusta, proseguo.
      const expected = children[0];
      const expectedSan = children.map((c) => c.san).join(" / ");
      setFeedback({ type: "wrong", text: `${san} isn't in the repertoire. Correct: ${expectedSan}.` });
      setStats((s) => ({ ...s, wrong: s.wrong + 1 }));
      if (expected) {
        void recordRepertoireAttempt(repertoireId, expected.id, false);
        setCurrentId(expected.id);
        setPhase(computePhase(expected.id));
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Train · {name}
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            {reviewMode ? "Review of due items" : "Repertoire drill"} ·{" "}
            {color === "white" ? "White" : "Black"}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          {reviewMode && dueIds.length > 0 && <Badge>{dueIds.length} due</Badge>}
          <span className="font-mono text-text-muted">
            ✓ {stats.correct} · ✗ {stats.wrong}
          </span>
        </div>
      </div>

      <div className="lg:grid lg:gap-6 lg:grid-cols-[minmax(0,1fr)_24rem] 2xl:grid-cols-[auto_22rem] 2xl:justify-center">
        <div className="space-y-3">
          {currentTrap && (
            <div className="rounded-md border border-border bg-surface-2 px-3 py-2 text-sm">
              ⚠ Careful: there&apos;s a trap here,{" "}
              <Link
                href={`/app/trappole/${currentTrap.slug}`}
                className="font-medium underline underline-offset-2 hover:text-text"
              >
                {currentTrap.name}
              </Link>
              .
            </div>
          )}
          <div
            ref={boardWrapRef}
            tabIndex={0}
            className="board-sized mx-auto w-full max-w-xl rounded-md outline-none focus-visible:ring-2 focus-visible:ring-text lg:max-w-none"
          >
            <ChessBoard
              fen={fen}
              orientation={color}
              mode={phase === "user" ? "play" : "view"}
              movableColor={color}
              dests={dests}
              lastMove={lastMove}
              onMove={onUserMove}
            />
          </div>

          <div className="flex items-center justify-end gap-3">
            <Button variant="secondary" size="sm" onClick={startLine}>
              New line
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>
                {phase === "user"
                  ? "Your turn"
                  : phase === "opponent"
                    ? "The opponent is moving…"
                    : "End of line"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {phase === "user" && !feedback && (
                <p className="text-sm text-text-muted">
                  Play your repertoire move.
                </p>
              )}
              {feedback && (
                <p
                  className="text-sm font-medium"
                  style={{
                    color:
                      feedback.type === "ok" ? "var(--eval-best)" : "var(--eval-mistake)",
                  }}
                >
                  {feedback.text}
                </p>
              )}
              {lineNote && <p className="text-sm text-text-muted">{lineNote}</p>}
              {phase === "end" && (
                <Button size="sm" onClick={startLine}>
                  Train another line
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Explorer: contesto reale della posizione (e dell'uscita dal repertorio). */}
        <div>
          <Card>
            <CardContent className="pt-4">
              <OpeningExplorer fen={outOfBookFen ?? fen} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
