"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { Square, PieceSymbol } from "chess.js";
import {
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
} from "lucide-react";
import { useChessGame } from "@/lib/chess/useChessGame";
import { engine } from "@/lib/engine/engine";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmResignButton } from "@/components/play/ConfirmResignButton";
import { GameOverOverlay, type GameOutcome } from "@/components/play/GameOverOverlay";
import { gameStatsFromFen } from "@/lib/chess/summary";
import { MoveStripH } from "@/components/chess/MoveStripH";
import { MobilePageHeader } from "@/components/layout/MobilePageHeader";
import { cn } from "@/lib/utils";
import { chooseEngineMove, strengthFor, STYLE_LABEL, type Style } from "@/lib/sparring/opponent";

const ChessBoard = dynamic(
  () => import("@/components/chess/ChessBoard").then((m) => m.ChessBoard),
  { ssr: false },
);

type Color = "white" | "black";
type ColorChoice = Color | "random";

/** Avversari selezionabili: nome + Elo. Coprono dal principiante assoluto al forte. */
const BOTS: { elo: number; name: string }[] = [
  { elo: 400, name: "Hatchling" },
  { elo: 600, name: "Novice" },
  { elo: 800, name: "Beginner" },
  { elo: 1000, name: "Amateur" },
  { elo: 1200, name: "Casual" },
  { elo: 1400, name: "Club" },
  { elo: 1600, name: "Expert" },
  { elo: 2000, name: "Candidate Master" },
  { elo: 2400, name: "Master" },
];

const NAME_FOR_ELO = (e: number) => BOTS.find((b) => b.elo === e)?.name ?? `${e}`;

/** Aperture seme (UCI): danno una posizione di partenza tematica. */
const OPENINGS: { key: string; label: string; moves: string[] }[] = [
  { key: "normale", label: "Standard game", moves: [] },
  { key: "italiana", label: "Italian", moves: ["e2e4", "e7e5", "g1f3", "b8c6", "f1c4"] },
  { key: "spagnola", label: "Ruy Lopez", moves: ["e2e4", "e7e5", "g1f3", "b8c6", "f1b5"] },
  { key: "siciliana", label: "Sicilian", moves: ["e2e4", "c7c5"] },
  { key: "francese", label: "French", moves: ["e2e4", "e7e6"] },
  { key: "gambetto-donna", label: "Queen's Gambit", moves: ["d2d4", "d7d5", "c2c4"] },
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
  const [styleRandom, setStyleRandom] = useState(false);
  const [elo, setElo] = useState(1200);
  const [eloRandom, setEloRandom] = useState(false);
  const [colorChoice, setColorChoice] = useState<ColorChoice>("white");
  const [openingKey, setOpeningKey] = useState("normale");
  const [openingRandom, setOpeningRandom] = useState(false);

  const [userColor, setUserColor] = useState<Color>("white");
  // Avversario effettivo della partita in corso (dopo aver risolto i "casuale").
  const [activeStyle, setActiveStyle] = useState<Style>("positional");
  const [activeElo, setActiveElo] = useState(1200);
  const [thinking, setThinking] = useState(false);
  const [resigned, setResigned] = useState(false);
  const [overlayOff, setOverlayOff] = useState(false);
  // Pre-mossa: trattenuta mentre tocca all'avversario, giocata appena torna il turno.
  const [premove, setPremove] = useState<{ from: Square; to: Square } | null>(null);

  const strength = strengthFor(activeElo);
  const engineColorChar = userColor === "white" ? "b" : "w";

  // Avvio partita: imposta colore, semina l'apertura, passa a "play".
  const start = useCallback(() => {
    const color: Color =
      colorChoice === "random" ? (Math.random() < 0.5 ? "white" : "black") : colorChoice;
    setUserColor(color);

    // Risolvi le scelte "casuale" una volta sola, all'avvio della partita.
    const STYLES: Style[] = ["aggressive", "positional", "drawish"];
    setActiveStyle(styleRandom ? STYLES[Math.floor(Math.random() * STYLES.length)] : style);
    setActiveElo(eloRandom ? BOTS[Math.floor(Math.random() * BOTS.length)].elo : elo);

    setResigned(false);
    setOverlayOff(false);
    setPremove(null);
    game.reset();
    const realOpeningKey = openingRandom
      ? OPENINGS[Math.floor(Math.random() * OPENINGS.length)].key
      : openingKey;
    const opening = OPENINGS.find((o) => o.key === realOpeningKey);
    if (opening) {
      for (const uci of opening.moves) {
        const p = uciParts(uci);
        game.move(p.from, p.to, p.promotion);
      }
    }
    setPhase("play");
  }, [colorChoice, openingKey, openingRandom, style, styleRandom, elo, eloRandom, game]);

  // Mossa del motore quando tocca a lui.
  useEffect(() => {
    if (phase !== "play" || resigned || game.isGameOver) return;
    // Solo a posizione corrente (live): se l'utente sta rivedendo mosse passate,
    // il motore non deve muovere (troncherebbe la partita).
    if (game.cursor < game.history.length - 1) return;
    if (game.turn !== engineColorChar) return;

    let cancelled = false;
    setThinking(true);
    const fen = game.fen;
    (async () => {
      try {
        const handle = engine.analyze(fen, { depth: strength.depth, multiPV: 4 });
        const result = await handle.result;
        if (cancelled) return;
        const uci = chooseEngineMove(fen, result.lines, activeStyle, strength);
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
  }, [phase, game.fen, game.turn, game.isGameOver, resigned, engineColorChar, activeStyle, strength.depth]);

  const onUserMove = useCallback(
    (from: Square, to: Square, promotion?: PieceSymbol) => {
      if (thinking || game.turn !== userColor[0]) return;
      // Si muove solo dalla posizione corrente (live), mai rivedendo il passato.
      if (game.cursor < game.history.length - 1) return;
      game.move(from, to, promotion);
    },
    [thinking, game, userColor],
  );

  // Pre-mossa: appena torna il turno dell'utente, gioca quella prenotata.
  // Se nel frattempo è diventata illegale (pezzo catturato, scacco…), la scarta.
  useEffect(() => {
    if (!premove) return;
    if (phase !== "play" || resigned || game.isGameOver) return;
    if (game.cursor < game.history.length - 1) return;
    if (game.turn !== userColor[0]) return; // tocca ancora all'avversario
    setPremove(null);
    // chess.js esige la promozione: se la mossa senza promozione fallisce, riprova a Donna.
    const ok = game.move(premove.from, premove.to);
    if (!ok) game.move(premove.from, premove.to, "q");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [premove, game.turn, game.fen, phase, resigned, game.isGameOver, userColor]);

  // ---------- Setup ----------
  if (phase === "setup") {
    return (
      <div className="space-y-6">
        <MobilePageHeader
          eyebrow="Against the engine"
          title="Sparring"
          desc="Full games against a personality and a strength you choose."
        />
        <div className="hidden md:block">
          <h1 className="font-display text-2xl font-semibold tracking-tight">Sparring</h1>
          <p className="mt-2 max-w-2xl text-text-muted">
            Play full games against the engine with a <strong>personality</strong> and a strength
            you choose: aggressive, positional, or solid. Drill your openings and sharpen your play
            against different styles.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>New challenge</CardTitle>
          </CardHeader>
        <CardContent className="space-y-5">
          <Field label="Opponent style">
            <Group>
              {(["aggressive", "positional", "drawish"] as Style[]).map((s) => (
                <Choice key={s} active={!styleRandom && style === s} onClick={() => { setStyleRandom(false); setStyle(s); }}>
                  {STYLE_LABEL[s]}
                </Choice>
              ))}
              <Choice active={styleRandom} onClick={() => setStyleRandom(true)}>
                Random
              </Choice>
            </Group>
          </Field>
          <Field label="Strength (Elo)">
            <Group>
              {BOTS.map((b) => (
                <Choice key={b.elo} active={!eloRandom && elo === b.elo} onClick={() => { setEloRandom(false); setElo(b.elo); }}>
                  {b.name} · {b.elo}
                </Choice>
              ))}
              <Choice active={eloRandom} onClick={() => setEloRandom(true)}>
                Random
              </Choice>
            </Group>
          </Field>
          <Field label="Your color">
            <Group>
              {(["white", "black", "random"] as ColorChoice[]).map((c) => (
                <Choice key={c} active={colorChoice === c} onClick={() => setColorChoice(c)}>
                  {c === "white" ? "White" : c === "black" ? "Black" : "Random"}
                </Choice>
              ))}
            </Group>
          </Field>
          <Field label="Starting opening">
            <Group>
              {OPENINGS.map((o) => (
                <Choice key={o.key} active={!openingRandom && openingKey === o.key} onClick={() => { setOpeningRandom(false); setOpeningKey(o.key); }}>
                  {o.label}
                </Choice>
              ))}
              <Choice active={openingRandom} onClick={() => setOpeningRandom(true)}>
                Random
              </Choice>
            </Group>
          </Field>
          <Button onClick={start}>Start playing</Button>
        </CardContent>
        </Card>
      </div>
    );
  }

  // ---------- Play ----------
  const atLive = game.cursor >= game.history.length - 1;
  // Partita "viva": posizione corrente, non finita, non abbandonata.
  const liveOpen = atLive && !resigned && !game.isGameOver;
  const canMove = liveOpen && !thinking && game.turn === userColor[0];
  const status = gameStatus(game, userColor, resigned);
  const result = sparringResult(game, userColor, resigned);

  return (
    <div className="lg:grid lg:gap-6 lg:grid-cols-[minmax(0,1fr)_16rem] 2xl:grid-cols-[auto_16rem] 2xl:justify-center">
      <div className="board-sized mx-auto w-full max-w-xl space-y-3 lg:max-w-none">
        <PlayerBar
          name={`${NAME_FOR_ELO(activeElo)} · ${activeElo}`}
          sub={STYLE_LABEL[activeStyle]}
          active={!status && game.turn === engineColorChar}
          note={thinking ? "thinking…" : undefined}
        />
        <div className="relative">
          <ChessBoard
            fen={game.fen}
            orientation={userColor}
            mode={liveOpen ? "play" : "view"}
            movableColor={userColor}
            dests={canMove ? game.legalDests : new Map()}
            lastMove={game.lastMove}
            check={game.isCheck}
            onMove={onUserMove}
            premovable={liveOpen}
            onPremove={(from, to) => setPremove({ from, to })}
            onPremoveCancel={() => setPremove(null)}
          />
          {result && !overlayOff && (
            <GameOverOverlay
              title={result.title}
              subtitle={result.subtitle}
              checkmate={result.checkmate}
              outcome={result.outcome}
              stats={gameStatsFromFen(game.fen)}
              onDismiss={() => setOverlayOff(true)}
              actions={
                <Button size="sm" className="w-full" onClick={start}>
                  Rematch
                </Button>
              }
            />
          )}
        </div>
        <PlayerBar
          name="You"
          sub={userColor === "white" ? "White" : "Black"}
          active={!status && game.turn === userColor[0]}
        />

        {/* Mobile: striscia mosse orizzontale + controlli inizio/indietro/avanti/fine. */}
        {game.history.length > 0 && (
          <div className="lg:hidden">
            <MoveStripH
              history={game.history}
              cursor={game.cursor}
              onSelect={game.goTo}
            />
          </div>
        )}
        <div className="flex items-center gap-2 lg:hidden">
          <Button
            variant="secondary"
            size="icon"
            className="flex-1"
            onClick={game.first}
            disabled={game.cursor < 0}
            aria-label="First move"
          >
            <ChevronsLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="flex-1"
            onClick={game.prev}
            disabled={game.cursor < 0}
            aria-label="Previous move"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="flex-1"
            onClick={game.next}
            disabled={atLive}
            aria-label="Next move"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="flex-1"
            onClick={game.last}
            disabled={atLive}
            aria-label="Last move"
          >
            <ChevronsRight className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-text-muted">
            {status ?? (thinking ? "Opponent is thinking…" : `Your move (${userColor === "white" ? "White" : "Black"})`)}
          </span>
          <div className="flex gap-2">
            {status && (
              <Button size="sm" onClick={start}>
                Rematch
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={() => setPhase("setup")}>
              New challenge
            </Button>
          </div>
        </div>
      </div>

      <aside className="space-y-4">
        {!status && (
          <ConfirmResignButton
            onConfirm={() => setResigned(true)}
            className="w-full"
          />
        )}
        <div className="hidden lg:block">
          <MoveList history={game.history} />
        </div>
      </aside>
    </div>
  );
}

function gameStatus(
  game: ReturnType<typeof useChessGame>,
  userColor: Color,
  resigned: boolean,
): string | null {
  if (resigned) return "You resigned.";
  if (game.isCheckmate) {
    // Sotto matto perde chi deve muovere.
    const loserIsUser = game.turn === userColor[0];
    return loserIsUser ? "Checkmate — you lost." : "Checkmate — you won!";
  }
  if (game.isStalemate) return "Stalemate — draw.";
  if (game.isDraw) return "Draw.";
  return null;
}

/** Esito strutturato per la schermata finale (overlay sulla scacchiera). */
function sparringResult(
  game: ReturnType<typeof useChessGame>,
  userColor: Color,
  resigned: boolean,
): { title: string; subtitle?: string; checkmate: boolean; outcome: GameOutcome } | null {
  if (resigned)
    return { title: "You lost", subtitle: "You resigned the game.", checkmate: false, outcome: "loss" };
  if (game.isCheckmate) {
    // Sotto matto perde chi deve muovere.
    const loserIsUser = game.turn === userColor[0];
    return loserIsUser
      ? { title: "You lost", checkmate: true, outcome: "loss" }
      : { title: "You won", checkmate: true, outcome: "win" };
  }
  if (game.isStalemate) return { title: "Draw", subtitle: "Stalemate.", checkmate: false, outcome: "draw" };
  if (game.isDraw) return { title: "Draw", checkmate: false, outcome: "draw" };
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
      <div className="mb-2 text-xs uppercase tracking-wide text-text-muted">Moves</div>
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

/** Barra giocatore (avversario sopra, tu sotto) come in "Gioca con un amico". */
function PlayerBar({
  name,
  sub,
  active,
  note,
}: {
  name: string;
  sub: string;
  active: boolean;
  note?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-md border px-3 py-2 transition-colors",
        active ? "border-text bg-surface" : "border-border bg-surface-2",
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "h-2 w-2 rounded-full",
            active ? "bg-text" : "bg-border",
          )}
          aria-hidden
        />
        <span className="text-sm font-medium">{name}</span>
        <span className="text-xs text-text-muted">{sub}</span>
      </div>
      {note && <span className="text-xs text-text-muted">{note}</span>}
    </div>
  );
}
