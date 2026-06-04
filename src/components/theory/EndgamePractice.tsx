"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Chess, type Square, type PieceSymbol } from "chess.js";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  fetchTablebase,
  isTablebaseEligible,
  moveQuality,
  type TbCategory,
  type MoveQuality,
} from "@/lib/theory/tablebase";
import { engine } from "@/lib/engine/engine";
import { recordEndgameResult } from "@/app/app/teoria/actions";
import type { LegalDests } from "@/lib/chess/useChessGame";
import type { EndgamePractice as Practice } from "@/lib/theory/endgame";

const ChessBoard = dynamic(
  () => import("@/components/chess/ChessBoard").then((m) => m.ChessBoard),
  { ssr: false },
);

type Status = "playing" | "won" | "drawn" | "lost" | "blunder";

/** Esito assoluto di una posizione DAL PUNTO DI VISTA del lato al tratto. */
function directQuality(category: TbCategory): MoveQuality {
  switch (category) {
    case "win":
    case "maybe-win":
    case "cursed-win":
      return "win";
    case "draw":
      return "draw";
    case "loss":
    case "maybe-loss":
    case "blessed-loss":
      return "loss";
    default:
      return "unknown";
  }
}

const QUALITY_LABEL: Record<MoveQuality, string> = {
  win: "winning",
  draw: "drawn",
  loss: "lost",
  unknown: "unknown",
};

function turnOf(fen: string): "white" | "black" {
  return fen.split(" ")[1] === "b" ? "black" : "white";
}

function buildDests(fen: string): LegalDests {
  const dests: LegalDests = new Map();
  const chess = new Chess(fen);
  for (const m of chess.moves({ verbose: true })) {
    const list = dests.get(m.from);
    if (list) list.push(m.to);
    else dests.set(m.from, [m.to]);
  }
  return dests;
}

function lastMoveOf(uci: string | null): [Square, Square] | null {
  if (!uci || uci.length < 4) return null;
  return [uci.slice(0, 2) as Square, uci.slice(2, 4) as Square];
}

export interface EndgamePracticeProps {
  practice: Practice;
}

/**
 * Pratica "risolvi il finale" (prompt 06c §1). L'utente deve CONVERTIRE l'esito
 * teorico (vincere una vinta, pattare una pattabile). L'avversario gioca la
 * DIFESA PERFETTA della tablebase (massima resistenza); dopo ogni mossa
 * dell'utente si verifica che l'esito NON peggiori — è didatticamente
 * impeccabile perché la tablebase è verità assoluta, niente allucinazioni.
 */
export function EndgamePractice({ practice }: EndgamePracticeProps) {
  const [history, setHistory] = useState<string[]>([practice.fen]);
  const [status, setStatus] = useState<Status>("playing");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<MoveQuality | null>(null);
  const [lastUci, setLastUci] = useState<string | null>(null);
  const [estimate, setEstimate] = useState(false);
  const recorded = useRef(false);

  const current = history[history.length - 1];
  const userTurn = turnOf(current) === practice.userColor;
  const interactive = status === "playing" && userTurn && !busy;

  const dests = useMemo<LegalDests>(
    () => (interactive ? buildDests(current) : new Map()),
    [interactive, current],
  );
  const isCheck = useMemo(() => new Chess(current).isCheck(), [current]);
  const lastMove = useMemo(() => lastMoveOf(lastUci), [lastUci]);

  // Indicatore dell'esito teorico corrente (quando tocca all'utente).
  useEffect(() => {
    let cancelled = false;
    if (status !== "playing" || !userTurn) return;
    if (!isTablebaseEligible(current)) {
      setOutcome(null);
      return;
    }
    fetchTablebase(current).then((res) => {
      if (cancelled || !res.ok) return;
      setOutcome(directQuality(res.data.category));
    });
    return () => {
      cancelled = true;
    };
  }, [current, status, userTurn]);

  const finish = useCallback(
    (next: Status, msg: string, success: boolean) => {
      setStatus(next);
      setMessage(msg);
      if (!recorded.current) {
        recorded.current = true;
        void recordEndgameResult(practice.progressKey, success);
      }
    },
    [practice.progressKey],
  );

  /** Mossa di difesa dell'avversario: la migliore della tablebase (o del motore). */
  const opponentReply = useCallback(
    async (afterUserFen: string): Promise<{ fen: string; uci: string } | null> => {
      if (isTablebaseEligible(afterUserFen)) {
        const res = await fetchTablebase(afterUserFen);
        if (res.ok && res.data.moves.length > 0) {
          // L'API ordina le mosse dalla migliore alla peggiore PER IL LATO AL
          // TRATTO: moves[0] è la difesa ottimale (massima resistenza).
          const best = res.data.moves[0];
          const chess = new Chess(afterUserFen);
          const m = chess.move(best.san);
          return { fen: chess.fen(), uci: `${m.from}${m.to}${m.promotion ?? ""}` };
        }
      }
      // Fallback: motore (stima), per posizioni fuori dalla tablebase.
      try {
        const evalRes = await engine.analyze(afterUserFen, { depth: 18 }).result;
        const uci = evalRes.bestMove;
        if (uci && uci.length >= 4) {
          const chess = new Chess(afterUserFen);
          const m = chess.move({
            from: uci.slice(0, 2) as Square,
            to: uci.slice(2, 4) as Square,
            promotion: (uci[4] as PieceSymbol | undefined) || undefined,
          });
          return { fen: chess.fen(), uci: `${m.from}${m.to}${m.promotion ?? ""}` };
        }
      } catch {
        /* ignore */
      }
      return null;
    },
    [],
  );

  const onUserMove = useCallback(
    async (from: Square, to: Square, promotion?: PieceSymbol) => {
      if (!interactive) return;

      // 1. Gioca la mossa dell'utente con chess.js (autorità sulla legalità).
      const chess = new Chess(current);
      let userMove;
      try {
        userMove = chess.move({ from, to, promotion });
      } catch {
        return;
      }
      const afterUser = chess.fen();
      const userUci = `${userMove.from}${userMove.to}${userMove.promotion ?? ""}`;
      setBusy(true);
      setMessage(null);
      setLastUci(userUci);

      // 2. Verifica del NON-PEGGIORAMENTO con la tablebase.
      const eligible = isTablebaseEligible(afterUser);
      setEstimate(!eligible);
      let userQ: MoveQuality = "unknown";
      if (eligible) {
        const res = await fetchTablebase(afterUser);
        if (res.ok) userQ = moveQuality(res.data.category); // esito per l'utente
      }

      const worsened =
        eligible &&
        (practice.goal === "win"
          ? userQ !== "win"
          : userQ === "loss"); // goal draw: solo "loss" è un peggioramento

      if (worsened) {
        // Mostra la posizione dopo l'errore, ma offri di ritentare.
        setHistory((h) => [...h, afterUser]);
        setStatus("blunder");
        setMessage(
          practice.goal === "win"
            ? `That throws away the win: the position is now ${QUALITY_LABEL[userQ]}. Go back and try again.`
            : `Careful: this move loses the draw (position ${QUALITY_LABEL[userQ]}). Go back and try again.`,
        );
        setBusy(false);
        return;
      }

      // 3. Esiti terminali dopo la mossa dell'utente.
      const afterChess = new Chess(afterUser);
      if (afterChess.isCheckmate()) {
        setHistory((h) => [...h, afterUser]);
        finish("won", "Mate! Endgame converted perfectly.", true);
        setBusy(false);
        return;
      }
      if (afterChess.isStalemate() || afterChess.isInsufficientMaterial() || afterChess.isDraw()) {
        setHistory((h) => [...h, afterUser]);
        if (practice.goal === "draw") finish("drawn", "Draw reached. Correct defense.", true);
        else finish("lost", "Stalemate: the win slipped into a draw.", false);
        setBusy(false);
        return;
      }

      // 4. Risposta dell'avversario (difesa perfetta).
      const reply = await opponentReply(afterUser);
      if (!reply) {
        setHistory((h) => [...h, afterUser]);
        setBusy(false);
        return;
      }
      const afterOppChess = new Chess(reply.fen);
      setHistory((h) => [...h, afterUser, reply.fen]);
      setLastUci(reply.uci);

      if (afterOppChess.isCheckmate()) {
        finish("lost", "The opponent checkmated you.", false);
      } else if (
        afterOppChess.isStalemate() ||
        afterOppChess.isInsufficientMaterial() ||
        afterOppChess.isDraw()
      ) {
        if (practice.goal === "draw") finish("drawn", "Draw reached. Correct defense.", true);
        else finish("lost", "Ended in a draw: the win slipped away.", false);
      }
      setBusy(false);
    },
    [interactive, current, practice.goal, finish, opponentReply],
  );

  const retry = useCallback(() => {
    // Torna alla posizione prima dell'ultima mossa dell'utente.
    setHistory((h) => (h.length > 1 ? h.slice(0, -1) : h));
    setStatus("playing");
    setMessage(null);
    setLastUci(null);
  }, []);

  const restart = useCallback(() => {
    recorded.current = false;
    setHistory([practice.fen]);
    setStatus("playing");
    setMessage(null);
    setLastUci(null);
    setOutcome(null);
    setEstimate(false);
  }, [practice.fen]);

  const claimDraw = useCallback(async () => {
    if (status !== "playing" || !userTurn || history.length <= 1) return;
    setBusy(true);
    const res = await fetchTablebase(current);
    setBusy(false);
    if (res.ok && directQuality(res.data.category) === "draw") {
      finish("drawn", "Draw held: you proved the defense. Result confirmed by the tablebase.", true);
    } else {
      setMessage("The position isn't a safe draw yet: keep defending.");
    }
  }, [status, userTurn, history.length, current, finish]);

  const goalText = practice.goal === "win" ? "Win the position" : "Hold the draw";
  const canClaimDraw = practice.goal === "draw" && status === "playing" && userTurn && history.length > 1;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>Endgame practice</CardTitle>
          <span className="text-xs text-text-muted">
            {goalText} · you play {practice.userColor === "white" ? "White" : "Black"}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_18rem] 2xl:grid-cols-[auto_18rem] 2xl:justify-center">
          <div className="board-sized mx-auto w-full max-w-md md:max-w-none">
            <ChessBoard
              fen={current}
              orientation={practice.userColor}
              mode="play"
              movableColor={practice.userColor}
              dests={dests}
              lastMove={lastMove}
              check={isCheck}
              onMove={onUserMove}
            />
          </div>

          <div className="space-y-3">
            {/* Esito teorico corrente (verità della tablebase). */}
            <div className="rounded-md border border-border bg-surface p-3">
              <p className="text-xs text-text-muted">Theoretical result</p>
              <p className="mt-0.5 text-sm font-medium">
                {estimate ? (
                  "Engine estimate (position outside the tablebase)"
                ) : outcome ? (
                  <>
                    Position{" "}
                    <span
                      className={cn(
                        "font-semibold",
                        outcome === "win" && "text-text",
                        outcome === "draw" && "text-text-muted",
                        outcome === "loss" && "text-text-muted",
                      )}
                    >
                      {QUALITY_LABEL[outcome]}
                    </span>{" "}
                    for you
                  </>
                ) : busy ? (
                  <span className="flex items-center gap-2 text-text-muted">
                    <Spinner /> Checking with the tablebase…
                  </span>
                ) : (
                  "—"
                )}
              </p>
            </div>

            {busy && (
              <p className="flex items-center gap-2 text-xs text-text-muted">
                <Spinner /> The opponent is defending…
              </p>
            )}

            {message && (
              <p
                className={cn(
                  "rounded-md border p-2 text-sm leading-relaxed",
                  status === "won" || status === "drawn"
                    ? "border-border bg-surface font-medium"
                    : "border-border bg-surface-2 text-text-muted",
                )}
              >
                {message}
              </p>
            )}

            {!message && practice.hint && status === "playing" && (
              <p className="text-xs text-text-muted">{practice.hint}</p>
            )}

            <div className="flex flex-wrap gap-2">
              {status === "blunder" && (
                <Button size="sm" onClick={retry}>
                  ← Try again
                </Button>
              )}
              {canClaimDraw && (
                <Button size="sm" variant="secondary" onClick={() => void claimDraw()} disabled={busy}>
                  Claim the draw
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={restart}>
                Restart
              </Button>
            </div>

            <p className="text-[11px] leading-relaxed text-text-muted">
              The opponent plays the Lichess tablebase&apos;s perfect defense. After
              each of your moves the result is verified: no approximations.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
