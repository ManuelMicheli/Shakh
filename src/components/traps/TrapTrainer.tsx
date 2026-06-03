"use client";

import { useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Chess, type Square, type PieceSymbol } from "chess.js";
import type { DrawShape } from "chessground/draw";
import { PuzzleSolver } from "@/components/tactics/PuzzleSolver";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import type { LegalDests } from "@/lib/chess/useChessGame";
import type { SerializedMoveTree } from "@/lib/chess/moveTree";
import { lureSan, mainlineUci, safeSans, triggerTurn } from "@/lib/traps/derive";
import type { Puzzle } from "@/lib/tactics/types";
import type { TrapMode, TrapSide } from "@/lib/traps/types";
import { recordTrapAttempt } from "@/app/app/trappole/actions";

const ChessBoard = dynamic(
  () => import("@/components/chess/ChessBoard").then((m) => m.ChessBoard),
  { ssr: false },
);

export interface TrapTrainerProps {
  trapId: string;
  slug: string;
  name: string;
  side: TrapSide;
  triggerFen: string;
  tree: SerializedMoveTree;
  mode: TrapMode;
  fromReview?: boolean;
  /** In sessione di ripasso: avanza alla trappola successiva. */
  onComplete?: (success: boolean) => void;
}

/**
 * Allenatore di una trappola nelle due modalità:
 *  - "tendi": riusa il `<PuzzleSolver>` (05) sulla linea registrata — l'app gioca
 *    l'esca dell'avversario, tu trovi la punizione (tolleranza matto equivalente).
 *  - "evita": dal lato di chi rischia, devi trovare la mossa SICURA che non abbocca.
 * Entrambe registrano il tentativo (attempts/successes + SRS) via Server Action.
 */
export function TrapTrainer(props: TrapTrainerProps) {
  return props.mode === "tendi" ? <TendiTrainer {...props} /> : <EvitaTrainer {...props} />;
}

// ───────────────────────────────── TENDI ─────────────────────────────────────

function TendiTrainer({
  trapId,
  slug,
  name,
  tree,
  fromReview,
  onComplete,
}: TrapTrainerProps) {
  const { toast } = useToast();
  const [round, setRound] = useState(0);
  const [done, setDone] = useState<null | boolean>(null);

  const puzzle: Puzzle = useMemo(
    () => ({
      id: trapId,
      fen: tree.nodes[tree.rootId].fen,
      moves: mainlineUci(tree),
      rating: 0,
      themes: [],
      popularity: null,
    }),
    [trapId, tree],
  );

  const onSolved = useCallback(
    async (success: boolean) => {
      setDone(success);
      const res = await recordTrapAttempt({
        trapId,
        mode: "tendi",
        success,
        fromReview: Boolean(fromReview),
      });
      if (!res.ok) {
        toast({ title: "Salvataggio non riuscito", description: res.error, variant: "error" });
      }
      onComplete?.(success);
    },
    [trapId, fromReview, onComplete, toast],
  );

  if (puzzle.moves.length < 2) {
    return <p className="text-sm text-text-muted">Linea della trappola incompleta.</p>;
  }

  return (
    <div className="space-y-4">
      <PuzzleSolver
        key={`${trapId}-${round}`}
        puzzle={puzzle}
        onSolved={(r) => void onSolved(r.clean)}
      />
      <Feedback
        done={done}
        slug={slug}
        name={name}
        mode="tendi"
        hideReplay={Boolean(onComplete)}
        onReplay={() => {
          setDone(null);
          setRound((r) => r + 1);
        }}
      />
    </div>
  );
}

// ───────────────────────────────── EVITA ─────────────────────────────────────

const NO_DESTS: LegalDests = new Map();

function buildDests(fen: string): LegalDests {
  const dests: LegalDests = new Map();
  for (const m of new Chess(fen).moves({ verbose: true })) {
    const list = dests.get(m.from);
    if (list) list.push(m.to);
    else dests.set(m.from, [m.to]);
  }
  return dests;
}

function EvitaTrainer({
  trapId,
  slug,
  name,
  triggerFen,
  tree,
  fromReview,
  onComplete,
}: TrapTrainerProps) {
  const { toast } = useToast();
  const lure = useMemo(() => lureSan(tree), [tree]);
  const safes = useMemo(() => new Set(safeSans(tree)), [tree]);
  // SAN della punizione (lo scatto): figlio dell'esca lungo la mainline.
  const punishment = useMemo(() => {
    const root = tree.nodes[tree.rootId];
    const lureNode = root?.children[0] ? tree.nodes[root.children[0]] : undefined;
    const scattoId = lureNode?.children[0];
    return scattoId ? tree.nodes[scattoId]?.san ?? null : null;
  }, [tree]);

  const victim: "white" | "black" = triggerTurn(triggerFen) === "w" ? "white" : "black";
  const dests = useMemo(() => buildDests(triggerFen), [triggerFen]);

  const [shapes, setShapes] = useState<DrawShape[]>([]);
  const [done, setDone] = useState<null | { success: boolean; text: string }>(null);
  const [round, setRound] = useState(0);

  const record = useCallback(
    async (success: boolean) => {
      const res = await recordTrapAttempt({
        trapId,
        mode: "evita",
        success,
        fromReview: Boolean(fromReview),
      });
      if (!res.ok) {
        toast({ title: "Salvataggio non riuscito", description: res.error, variant: "error" });
      }
      onComplete?.(success);
    },
    [trapId, fromReview, onComplete, toast],
  );

  const flashWrong = useCallback((from: Square, to: Square) => {
    setShapes([
      { orig: from, brush: "red" },
      { orig: to, brush: "red" },
    ]);
    window.setTimeout(() => setShapes([]), 700);
  }, []);

  const onMove = useCallback(
    (from: Square, to: Square, promotion?: PieceSymbol) => {
      if (done) return;
      let san: string;
      try {
        san = new Chess(triggerFen).move({ from, to, promotion }).san;
      } catch {
        return;
      }
      if (san === lure) {
        setShapes([{ orig: to, brush: "red" }]);
        setDone({
          success: false,
          text: punishment
            ? `${san}? Ci sei cascato: la punizione è ${punishment}.`
            : `${san}? Ci sei cascato nella trappola.`,
        });
        void record(false);
        return;
      }
      if (safes.has(san)) {
        setShapes([{ orig: from, dest: to, brush: "green" }]);
        setDone({ success: true, text: `${san} — corretto: hai evitato la trappola.` });
        void record(true);
        return;
      }
      // Mossa né-esca-né-sicura: non è quella che cerchiamo, riprova.
      flashWrong(from, to);
    },
    [done, triggerFen, lure, safes, punishment, record, flashWrong],
  );

  return (
    <div className="space-y-4">
      <div className="relative mx-auto w-full max-w-xl lg:max-w-2xl xl:max-w-4xl">
        <ChessBoard
          fen={triggerFen}
          orientation={victim}
          mode={done ? "view" : "play"}
          movableColor={victim}
          dests={done ? NO_DESTS : dests}
          shapes={shapes}
          onMove={onMove}
        />
      </div>

      {!done && (
        <p className="text-center text-sm text-text-muted">
          Muove il {victim === "white" ? "Bianco" : "Nero"}: trova la mossa che{" "}
          <strong>non</strong> casca nella trappola.
        </p>
      )}

      {done && (
        <Card>
          <CardHeader>
            <CardTitle>{done.success ? "Trappola evitata" : "Ci sei cascato"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p
              className="text-sm font-medium"
              style={{ color: done.success ? "var(--eval-best)" : "var(--eval-blunder)" }}
            >
              {done.text}
            </p>
            <FeedbackButtons
              slug={slug}
              name={name}
              mode="evita"
              hideReplay={Boolean(onComplete)}
              onReplay={() => {
                setDone(null);
                setShapes([]);
                setRound((r) => r + 1);
              }}
            />
          </CardContent>
        </Card>
      )}
      {/* round forza il remount logico quando si rigioca in standalone */}
      <span hidden>{round}</span>
    </div>
  );
}

// ──────────────────────────────── Feedback ───────────────────────────────────

function Feedback({
  done,
  slug,
  name,
  mode,
  hideReplay,
  onReplay,
}: {
  done: null | boolean;
  slug: string;
  name: string;
  mode: TrapMode;
  hideReplay: boolean;
  onReplay: () => void;
}) {
  if (done === null) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{done ? "Punizione trovata" : "Quasi!"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p
          className="text-sm font-medium"
          style={{ color: done ? "var(--eval-best)" : "var(--eval-mistake)" }}
        >
          {done
            ? "Hai eseguito la trappola correttamente."
            : "Hai sbagliato qualche mossa: ritornerà al ripasso."}
        </p>
        <FeedbackButtons
          slug={slug}
          name={name}
          mode={mode}
          hideReplay={hideReplay}
          onReplay={onReplay}
        />
      </CardContent>
    </Card>
  );
}

function FeedbackButtons({
  slug,
  name,
  mode,
  hideReplay,
  onReplay,
}: {
  slug: string;
  name: string;
  mode: TrapMode;
  hideReplay: boolean;
  onReplay: () => void;
}) {
  const other: TrapMode = mode === "tendi" ? "evita" : "tendi";
  if (hideReplay) return null; // in sessione di ripasso, avanza il contenitore
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" onClick={onReplay}>
        Rigioca
      </Button>
      <Link href={`/app/trappole/${slug}/allena?mode=${other}`}>
        <Button size="sm" variant="secondary">
          {other === "tendi" ? "Prova a tenderla" : "Prova a evitarla"}
        </Button>
      </Link>
      <Link href={`/app/trappole/${slug}`}>
        <Button size="sm" variant="ghost">
          {name}
        </Button>
      </Link>
    </div>
  );
}
