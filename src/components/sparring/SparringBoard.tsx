"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { Square, PieceSymbol } from "chess.js";
import { useChessGame } from "@/lib/chess/useChessGame";
import { engine } from "@/lib/engine/engine";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmResignButton } from "@/components/play/ConfirmResignButton";
import { cn } from "@/lib/utils";
import { chooseEngineMove, strengthFor, STYLE_LABEL, type Style } from "@/lib/sparring/opponent";

const ChessBoard = dynamic(
  () => import("@/components/chess/ChessBoard").then((m) => m.ChessBoard),
  { ssr: false },
);

type Color = "white" | "black";
type ColorChoice = Color | "random";

const ELOS = [800, 1200, 1600, 2000, 2400];

/** Aperture seme (UCI): danno una posizione di partenza tematica. */
const OPENINGS: { key: string; label: string; moves: string[] }[] = [
  { key: "normale", label: "Partita normale", moves: [] },
  { key: "italiana", label: "Italiana", moves: ["e2e4", "e7e5", "g1f3", "b8c6", "f1c4"] },
  { key: "spagnola", label: "Spagnola", moves: ["e2e4", "e7e5", "g1f3", "b8c6", "f1b5"] },
  { key: "siciliana", label: "Siciliana", moves: ["e2e4", "c7c5"] },
  { key: "francese", label: "Francese", moves: ["e2e4", "e7e6"] },
  { key: "gambetto-donna", label: "Gambetto di Donna", moves: ["d2d4", "d7d5", "c2c4"] },
];

function uciParts(uci: string): { from: Square; to: Square; promotion?: PieceSymbol } {
  return {
    from: uci.slice(0, 2) as Square,
    to: uci.slice(2, 4) as Square,
    promotion: uci.length > 4 ? (uci[4] as PieceSymbol) : undefined,
  };
}

export function SparringBoard() {
  const game = useChessGame();
  const [phase, setPhase] = useState<"setup" | "play">("setup");
  const [style, setStyle] = useState<Style>("positional");
  const [elo, setElo] = useState(1200);
  const [colorChoice, setColorChoice] = useState<ColorChoice>("white");
  const [openingKey, setOpeningKey] = useState("normale");

  const [userColor, setUserColor] = useState<Color>("white");
  const [thinking, setThinking] = useState(false);
  const [resigned, setResigned] = useState(false);

  const strength = strengthFor(elo);
  const engineColorChar = userColor === "white" ? "b" : "w";

  // Avvio partita: imposta colore, semina l'apertura, passa a "play".
  const start = useCallback(() => {
    const color: Color =
      colorChoice === "random" ? (Math.random() < 0.5 ? "white" : "black") : colorChoice;
    setUserColor(color);
    setResigned(false);
    game.reset();
    const opening = OPENINGS.find((o) => o.key === openingKey);
    if (opening) {
      for (const uci of opening.moves) {
        const p = uciParts(uci);
        game.move(p.from, p.to, p.promotion);
      }
    }
    setPhase("play");
  }, [colorChoice, openingKey, game]);

  // Mossa del motore quando tocca a lui.
  useEffect(() => {
    if (phase !== "play" || resigned || game.isGameOver) return;
    if (game.turn !== engineColorChar) return;

    let cancelled = false;
    setThinking(true);
    const fen = game.fen;
    (async () => {
      try {
        const handle = engine.analyze(fen, { depth: strength.depth, multiPV: 4 });
        const result = await handle.result;
        if (cancelled) return;
        const uci = chooseEngineMove(fen, result.lines, style, strength);
        if (uci) {
          const p = uciParts(uci);
          game.move(p.from, p.to, p.promotion);
        }
      } catch {
        /* motore non disponibile: lascia la mossa all'utente */
      } finally {
        if (!cancelled) setThinking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, game.fen, game.turn, game.isGameOver, resigned, engineColorChar, style, strength.depth]);

  const onUserMove = useCallback(
    (from: Square, to: Square, promotion?: PieceSymbol) => {
      if (thinking || game.turn !== userColor[0]) return;
      game.move(from, to, promotion);
    },
    [thinking, game, userColor],
  );

  // ---------- Setup ----------
  if (phase === "setup") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Nuova sfida</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <Field label="Stile dell'avversario">
            <Group>
              {(["aggressive", "positional", "drawish"] as Style[]).map((s) => (
                <Choice key={s} active={style === s} onClick={() => setStyle(s)}>
                  {STYLE_LABEL[s]}
                </Choice>
              ))}
            </Group>
          </Field>
          <Field label="Forza (Elo)">
            <Group>
              {ELOS.map((e) => (
                <Choice key={e} active={elo === e} onClick={() => setElo(e)}>
                  {e}
                </Choice>
              ))}
            </Group>
          </Field>
          <Field label="Il tuo colore">
            <Group>
              {(["white", "black", "random"] as ColorChoice[]).map((c) => (
                <Choice key={c} active={colorChoice === c} onClick={() => setColorChoice(c)}>
                  {c === "white" ? "Bianco" : c === "black" ? "Nero" : "Casuale"}
                </Choice>
              ))}
            </Group>
          </Field>
          <Field label="Apertura di partenza">
            <Group>
              {OPENINGS.map((o) => (
                <Choice key={o.key} active={openingKey === o.key} onClick={() => setOpeningKey(o.key)}>
                  {o.label}
                </Choice>
              ))}
            </Group>
          </Field>
          <Button onClick={start}>Inizia a giocare</Button>
        </CardContent>
      </Card>
    );
  }

  // ---------- Play ----------
  const canMove = !thinking && !resigned && !game.isGameOver && game.turn === userColor[0];
  const status = gameStatus(game, userColor, resigned);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_16rem]">
      <div className="mx-auto w-full max-w-xl space-y-3 lg:max-w-none">
        <ChessBoard
          fen={game.fen}
          orientation={userColor}
          mode="play"
          movableColor={userColor}
          dests={canMove ? game.legalDests : new Map()}
          lastMove={game.lastMove}
          check={game.isCheck}
          onMove={onUserMove}
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-text-muted">
            {status ?? (thinking ? "L'avversario pensa…" : `Muovi tu (${userColor === "white" ? "Bianco" : "Nero"})`)}
          </span>
          <div className="flex gap-2">
            {status && (
              <Button size="sm" onClick={start}>
                Rivincita
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={() => setPhase("setup")}>
              Nuova sfida
            </Button>
          </div>
        </div>
      </div>

      <aside className="space-y-4">
        <Info label="Avversario" value={`${STYLE_LABEL[style]} · ${elo}`} />
        {!status && (
          <ConfirmResignButton
            onConfirm={() => setResigned(true)}
            className="w-full"
          />
        )}
        <MoveList history={game.history} />
      </aside>
    </div>
  );
}

function gameStatus(
  game: ReturnType<typeof useChessGame>,
  userColor: Color,
  resigned: boolean,
): string | null {
  if (resigned) return "Hai abbandonato.";
  if (game.isCheckmate) {
    // Sotto matto perde chi deve muovere.
    const loserIsUser = game.turn === userColor[0];
    return loserIsUser ? "Scacco matto — hai perso." : "Scacco matto — hai vinto!";
  }
  if (game.isStalemate) return "Stallo — patta.";
  if (game.isDraw) return "Patta.";
  return null;
}

function MoveList({ history }: { history: ReturnType<typeof useChessGame>["history"] }) {
  const rows: { no: number; white?: string; black?: string }[] = [];
  history.forEach((m, i) => {
    const no = Math.floor(i / 2) + 1;
    if (i % 2 === 0) rows.push({ no, white: m.san });
    else rows[rows.length - 1].black = m.san;
  });
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <div className="mb-2 text-xs uppercase tracking-wide text-text-muted">Mosse</div>
      <div className="max-h-72 overflow-y-auto font-mono text-sm">
        {rows.length === 0 ? (
          <span className="text-text-muted">—</span>
        ) : (
          rows.map((r) => (
            <div key={r.no} className="flex gap-2">
              <span className="w-6 text-text-muted">{r.no}.</span>
              <span className="w-16">{r.white}</span>
              <span className="w-16">{r.black ?? ""}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-xs uppercase tracking-wide text-text-muted">{label}</div>
      {children}
    </div>
  );
}

function Group({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-2">{children}</div>;
}

function Choice({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md border px-3 py-1.5 text-sm transition-colors",
        active ? "border-text bg-text text-bg" : "border-border text-text-muted hover:text-text",
      )}
    >
      {children}
    </button>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="text-xs uppercase tracking-wide text-text-muted">{label}</div>
      <div className="mt-1 text-sm font-medium">{value}</div>
    </div>
  );
}
