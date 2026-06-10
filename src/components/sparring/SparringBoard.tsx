"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { Chess, type Square, type PieceSymbol } from "chess.js";
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
import { CapturedMaterial } from "@/components/chess/CapturedMaterial";
import { useGameBreakdown } from "@/lib/analysis/useGameBreakdown";
import { useAnalyzePlayedGame } from "@/lib/play/useAnalyzePlayedGame";
import { MoveStripH } from "@/components/chess/MoveStripH";
import { BoardControls } from "@/components/chess/BoardControls";
import { MobilePageHeader } from "@/components/layout/MobilePageHeader";
import { cn } from "@/lib/utils";
import { chooseEngineMove, strengthFor, STYLE_LABEL, type Style } from "@/lib/sparring/opponent";
import { classifyMove } from "@/lib/analysis/classify";
import type { PovEval } from "@/lib/analysis/evalScore";
import { formatEval } from "@/lib/engine/score";
import type { Classification } from "@/lib/games/types";

const ChessBoard = dynamic(
  () => import("@/components/chess/ChessBoard").then((m) => m.ChessBoard),
  { ssr: false },
);

type Color = "white" | "black";
type ColorChoice = Color | "random";

/** Avversari selezionabili: chiave i18n + Elo. Coprono dal principiante assoluto al forte. */
const BOTS: { elo: number; key: string }[] = [
  { elo: 400, key: "hatchling" },
  { elo: 600, key: "novice" },
  { elo: 800, key: "beginner" },
  { elo: 1000, key: "amateur" },
  { elo: 1200, key: "casual" },
  { elo: 1400, key: "club" },
  { elo: 1600, key: "expert" },
  { elo: 2000, key: "candidateMaster" },
  { elo: 2400, key: "master" },
];

/** Chiave i18n del nome del bot per un dato Elo (fallback: l'Elo stesso). */
const BOT_KEY_FOR_ELO = (e: number) => BOTS.find((b) => b.elo === e)?.key ?? null;

/** Aperture seme (UCI): danno una posizione di partenza tematica. */
const OPENINGS: { key: string; moves: string[] }[] = [
  { key: "normale", moves: [] },
  { key: "italiana", moves: ["e2e4", "e7e5", "g1f3", "b8c6", "f1c4"] },
  { key: "spagnola", moves: ["e2e4", "e7e5", "g1f3", "b8c6", "f1b5"] },
  { key: "siciliana", moves: ["e2e4", "c7c5"] },
  { key: "francese", moves: ["e2e4", "e7e6"] },
  { key: "gambetto-donna", moves: ["d2d4", "d7d5", "c2c4"] },
];

function uciParts(uci: string): { from: Square; to: Square; promotion?: PieceSymbol } {
  return {
    from: uci.slice(0, 2) as Square,
    to: uci.slice(2, 4) as Square,
    promotion: uci.length > 4 ? (uci[4] as PieceSymbol) : undefined,
  };
}

export function SparringBoard() {
  const t = useTranslations("play");
  const game = useChessGame();
  // Nome localizzato del bot per un Elo (fallback: l'Elo numerico).
  const nameForElo = (e: number) => {
    const key = BOT_KEY_FOR_ELO(e);
    return key ? t(`bot.${key}`) : `${e}`;
  };
  const [phase, setPhase] = useState<"setup" | "play">("setup");
  const [style, setStyle] = useState<Style>("positional");
  const [styleRandom, setStyleRandom] = useState(false);
  const [elo, setElo] = useState(1200);
  const [eloRandom, setEloRandom] = useState(false);
  const [colorChoice, setColorChoice] = useState<ColorChoice>("white");
  const [openingKey, setOpeningKey] = useState("normale");
  const [openingRandom, setOpeningRandom] = useState(false);

  const [userColor, setUserColor] = useState<Color>("white");
  // Scacchiera girata manualmente (controllo "flip" desktop); si resetta a ogni partita.
  const [flipped, setFlipped] = useState(false);
  const boardWrapRef = useRef<HTMLDivElement>(null);
  // Avversario effettivo della partita in corso (dopo aver risolto i "casuale").
  const [activeStyle, setActiveStyle] = useState<Style>("positional");
  const [activeElo, setActiveElo] = useState(1200);
  const [thinking, setThinking] = useState(false);
  const [resigned, setResigned] = useState(false);
  const [overlayOff, setOverlayOff] = useState(false);
  // Pre-mossa: trattenuta mentre tocca all'avversario, giocata appena torna il turno.
  const [premove, setPremove] = useState<{ from: Square; to: Square } | null>(null);

  // ---- Coach di allenamento: spiega cosa cambia sulla scacchiera a ogni tua mossa ----
  const [coachOn, setCoachOn] = useState(true);
  const [coachUnavailable, setCoachUnavailable] = useState(false);
  const [coachItem, setCoachItem] = useState<{ san: string; text: string; busy: boolean } | null>(null);
  // Analisi della posizione PRIMA della mossa dell'utente (fatta mentre pensa).
  const preAnalysisRef = useRef<{
    fen: string;
    bestUci: string | null;
    bestSan: string | null;
    evalWhite: PovEval;
  } | null>(null);
  // Mossa dell'utente in attesa della valutazione "dopo" (dall'analisi di risposta).
  const pendingCoachRef = useRef<{ ply: number; fenBefore: string; san: string; uci: string } | null>(null);
  const lastCoachPlyRef = useRef(-1);
  const openingPliesRef = useRef(0);
  const coachAbortRef = useRef<AbortController | null>(null);

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
    setFlipped(false);
    // Reset del coach di allenamento: niente feedback sulle mosse seminate.
    coachAbortRef.current?.abort();
    setCoachItem(null);
    preAnalysisRef.current = null;
    pendingCoachRef.current = null;
    lastCoachPlyRef.current = -1;
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
    openingPliesRef.current = opening ? opening.moves.length : 0;
    setPhase("play");
  }, [colorChoice, openingKey, openingRandom, style, styleRandom, elo, eloRandom, game]);

  /**
   * Invia al coach la mossa dell'utente in attesa: il server ricalcola gli
   * effetti sulla scacchiera e il modello li spiega in streaming.
   * `evalAfterWhite` può mancare (matto immediato, motore ko): si manda comunque.
   */
  const sendCoachRequest = useCallback(
    async (evalAfterWhite: PovEval | null) => {
      const pending = pendingCoachRef.current;
      if (!pending) return;
      pendingCoachRef.current = null;

      const pre =
        preAnalysisRef.current && preAnalysisRef.current.fen === pending.fenBefore
          ? preAnalysisRef.current
          : null;
      let classification: Classification | null = null;
      if (pre?.bestUci && evalAfterWhite) {
        try {
          classification = classifyMove({
            evalBefore: pre.evalWhite,
            evalAfter: evalAfterWhite,
            moverIsWhite: userColor === "white",
            playedUci: pending.uci,
            bestUci: pre.bestUci,
          });
        } catch {
          classification = null;
        }
      }
      const fmt = (e: PovEval | null) =>
        e ? formatEval(e.value, e.type).replace("-", "−") : null;

      coachAbortRef.current?.abort();
      const ac = new AbortController();
      coachAbortRef.current = ac;
      try {
        const res = await fetch("/api/coach/train-move", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fenBefore: pending.fenBefore,
            playedSan: pending.san,
            bestMoveSan: pre?.bestSan ?? null,
            evalBeforeText: fmt(pre?.evalWhite ?? null),
            evalAfterText: fmt(evalAfterWhite),
            classification,
          }),
          signal: ac.signal,
        });
        if (res.status === 503) {
          setCoachUnavailable(true);
          setCoachItem(null);
          return;
        }
        if (!res.ok || !res.body) {
          setCoachItem(null);
          return;
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let acc = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          if (ac.signal.aborted) return;
          setCoachItem({ san: pending.san, text: acc, busy: true });
        }
        setCoachItem({ san: pending.san, text: acc, busy: false });
      } catch {
        if (!ac.signal.aborted) setCoachItem(null);
      }
    },
    [userColor],
  );

  // Coach: mentre l'utente pensa, analizza la posizione corrente (valutazione
  // "prima" + mossa migliore). Il motore è comunque inattivo in questo momento.
  useEffect(() => {
    if (!coachOn || coachUnavailable) return;
    if (phase !== "play" || resigned || game.isGameOver) return;
    if (game.cursor < game.history.length - 1) return;
    if (game.turn !== userColor[0]) return;

    let cancelled = false;
    const fen = game.fen;
    const turn = game.turn;
    (async () => {
      try {
        const handle = engine.analyze(fen, { depth: 12, multiPV: 1 });
        const res = await handle.result;
        if (cancelled) return;
        const line = res.lines[0];
        if (!line) return;
        const evalWhite: PovEval = {
          type: line.scoreType,
          value: turn === "w" ? line.score : -line.score,
        };
        const bestUci = res.bestMove || line.pv[0] || null;
        let bestSan: string | null = null;
        if (bestUci) {
          try {
            const c = new Chess(fen);
            const p = uciParts(bestUci);
            bestSan = c.move({ from: p.from, to: p.to, promotion: p.promotion })?.san ?? null;
          } catch {
            bestSan = null;
          }
        }
        preAnalysisRef.current = { fen, bestUci, bestSan, evalWhite };
      } catch {
        /* analisi soppiantata o motore ko: il coach farà senza */
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coachOn, coachUnavailable, phase, game.fen, game.turn, game.isGameOver, resigned, userColor]);

  // Coach: intercetta la mossa appena giocata dall'utente e mette in coda il feedback.
  useEffect(() => {
    if (!coachOn || coachUnavailable || phase !== "play" || resigned) return;
    const i = game.history.length - 1;
    if (i < 0 || i < openingPliesRef.current || i === lastCoachPlyRef.current) return;
    if (game.cursor < game.history.length - 1) return;
    const mover: Color = i % 2 === 0 ? "white" : "black";
    if (mover !== userColor) return;

    lastCoachPlyRef.current = i;
    const last = game.history[i];
    // FEN prima della mossa: ricostruita rigiocando la storia (deterministico).
    const c = new Chess();
    try {
      for (let k = 0; k < i; k++) {
        const m = game.history[k];
        c.move({ from: m.from, to: m.to, promotion: m.promotion });
      }
    } catch {
      return;
    }
    pendingCoachRef.current = {
      ply: i,
      fenBefore: c.fen(),
      san: last.san,
      uci: `${last.from}${last.to}${last.promotion ?? ""}`,
    };
    setCoachItem({ san: last.san, text: "", busy: true });
    // Se la mossa chiude la partita il motore non risponderà: manda subito.
    if (game.isGameOver) void sendCoachRequest(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coachOn, coachUnavailable, phase, resigned, game.history.length, game.isGameOver, userColor]);

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
        // Coach: la stessa analisi fornisce la valutazione "dopo" la mossa
        // dell'utente (white-relative) per classificare e commentare.
        if (pendingCoachRef.current) {
          const top = result.lines[0];
          const evalAfterWhite: PovEval | null = top
            ? { type: top.scoreType, value: engineColorChar === "w" ? top.score : -top.score }
            : null;
          void sendCoachRequest(evalAfterWhite);
        }
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

  // Riepilogo qualità mosse a fine partita (analisi motore delle MIE mosse).
  const over = resigned || game.isGameOver;
  const pgn = useMemo(() => {
    if (!over) return null;
    const c = new Chess();
    for (const m of game.history) {
      try {
        c.move({ from: m.from, to: m.to, promotion: m.promotion });
      } catch {
        /* mossa non ricostruibile: salta */
      }
    }
    return c.pgn();
  }, [over, game.history]);
  const breakdown = useGameBreakdown(over, pgn, userColor[0] as "w" | "b");
  const { analyze, loading: analyzeLoading } = useAnalyzePlayedGame();

  // ---------- Setup ----------
  if (phase === "setup") {
    return (
      <div className="space-y-6">
        <MobilePageHeader
          eyebrow={t("sparring.eyebrow")}
          title="Sparring"
          desc={t("sparring.desc")}
        />
        <div className="hidden md:block">
          <h1 className="font-display text-2xl font-semibold tracking-tight">Sparring</h1>
          <p className="mt-2 max-w-2xl text-text-muted">
            {t.rich("sparring.lead", {
              strong: (chunks) => <strong>{chunks}</strong>,
            })}
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{t("sparring.newChallenge")}</CardTitle>
          </CardHeader>
        <CardContent className="space-y-5">
          <Field label={t("sparring.opponentStyle")}>
            <Group>
              {(["aggressive", "positional", "drawish"] as Style[]).map((s) => (
                <Choice key={s} active={!styleRandom && style === s} onClick={() => { setStyleRandom(false); setStyle(s); }}>
                  {STYLE_LABEL[s]}
                </Choice>
              ))}
              <Choice active={styleRandom} onClick={() => setStyleRandom(true)}>
                {t("random")}
              </Choice>
            </Group>
          </Field>
          <Field label={t("sparring.strength")}>
            <Group>
              {BOTS.map((b) => (
                <Choice key={b.elo} active={!eloRandom && elo === b.elo} onClick={() => { setEloRandom(false); setElo(b.elo); }}>
                  {t(`bot.${b.key}`)} · {b.elo}
                </Choice>
              ))}
              <Choice active={eloRandom} onClick={() => setEloRandom(true)}>
                {t("random")}
              </Choice>
            </Group>
          </Field>
          <Field label={t("color.your")}>
            <Group>
              {(["white", "black", "random"] as ColorChoice[]).map((c) => (
                <Choice key={c} active={colorChoice === c} onClick={() => setColorChoice(c)}>
                  {c === "white" ? t("color.white") : c === "black" ? t("color.black") : t("color.random")}
                </Choice>
              ))}
            </Group>
          </Field>
          <Field label={t("sparring.startingOpening")}>
            <Group>
              {OPENINGS.map((o) => (
                <Choice key={o.key} active={!openingRandom && openingKey === o.key} onClick={() => { setOpeningRandom(false); setOpeningKey(o.key); }}>
                  {t(`opening.${o.key}`)}
                </Choice>
              ))}
              <Choice active={openingRandom} onClick={() => setOpeningRandom(true)}>
                {t("random")}
              </Choice>
            </Group>
          </Field>
          <Button onClick={start}>{t("startPlaying")}</Button>
        </CardContent>
        </Card>
      </div>
    );
  }

  // ---------- Play ----------
  const toggleCoach = () => {
    if (coachOn) {
      coachAbortRef.current?.abort();
      pendingCoachRef.current = null;
      setCoachItem(null);
    }
    setCoachOn(!coachOn);
  };
  const atLive = game.cursor >= game.history.length - 1;
  // Partita "viva": posizione corrente, non finita, non abbandonata.
  const liveOpen = atLive && !resigned && !game.isGameOver;
  const canMove = liveOpen && !thinking && game.turn === userColor[0];
  const status = gameStatus(game, userColor, resigned, t);
  const result = sparringResult(game, userColor, resigned, t);

  return (
    <div className="lg:grid lg:gap-6 lg:grid-cols-[minmax(0,1fr)_16rem] 2xl:grid-cols-[auto_16rem] 2xl:justify-center">
      <div className="board-sized mx-auto w-full max-w-xl space-y-3 lg:max-w-none">
        <PlayerBar
          name={`${nameForElo(activeElo)} · ${activeElo}`}
          sub={STYLE_LABEL[activeStyle]}
          active={!status && game.turn === engineColorChar}
          note={thinking ? t("sparring.thinking") : undefined}
          material={<CapturedMaterial fen={game.fen} color={engineColorChar} />}
        />
        <div
          ref={boardWrapRef}
          tabIndex={0}
          className="relative rounded-md outline-none focus-visible:ring-2 focus-visible:ring-text"
        >
          <ChessBoard
            fen={game.fen}
            orientation={flipped ? (userColor === "white" ? "black" : "white") : userColor}
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
              breakdown={breakdown.groups}
              analyzing={breakdown.loading}
              analyzeLoading={analyzeLoading}
              onAnalyze={
                pgn && result
                  ? () => {
                      const bot = `${nameForElo(activeElo)} ${activeElo}`;
                      const res =
                        result.outcome === "draw"
                          ? "1/2-1/2"
                          : result.outcome === "win"
                            ? userColor === "white"
                              ? "1-0"
                              : "0-1"
                            : userColor === "white"
                              ? "0-1"
                              : "1-0";
                      analyze({
                        pgn,
                        white: userColor === "white" ? t("sparring.you") : bot,
                        black: userColor === "black" ? t("sparring.you") : bot,
                        result: res,
                        userColor: userColor[0] as "w" | "b",
                      });
                    }
                  : undefined
              }
              onDismiss={() => setOverlayOff(true)}
              actions={
                <Button size="sm" className="w-full" onClick={start}>
                  {t("sparring.rematch")}
                </Button>
              }
            />
          )}
        </div>
        <PlayerBar
          name={t("sparring.you")}
          sub={userColor === "white" ? t("color.white") : t("color.black")}
          active={!status && game.turn === userColor[0]}
          material={<CapturedMaterial fen={game.fen} color={userColor[0] as "w" | "b"} />}
        />

        {/* Desktop: controlli inizio/indietro/avanti/fine + gira scacchiera. */}
        <div className="hidden lg:flex">
          <BoardControls
            onFirst={game.first}
            onPrev={game.prev}
            onNext={game.next}
            onLast={game.last}
            onFlip={() => setFlipped((f) => !f)}
            atStart={game.cursor < 0}
            atEnd={atLive}
            keyboardTarget={boardWrapRef}
          />
        </div>

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
            aria-label={t("nav.first")}
          >
            <ChevronsLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="flex-1"
            onClick={game.prev}
            disabled={game.cursor < 0}
            aria-label={t("nav.prev")}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="flex-1"
            onClick={game.next}
            disabled={atLive}
            aria-label={t("nav.next")}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="flex-1"
            onClick={game.last}
            disabled={atLive}
            aria-label={t("nav.last")}
          >
            <ChevronsRight className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-text-muted">
            {status ??
              (thinking
                ? t("sparring.opponentThinking")
                : t("sparring.yourMove", {
                    color: userColor === "white" ? t("color.white") : t("color.black"),
                  }))}
          </span>
          <div className="flex gap-2">
            {status && (
              <Button size="sm" onClick={start}>
                {t("sparring.rematch")}
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={() => setPhase("setup")}>
              {t("sparring.newChallenge")}
            </Button>
          </div>
        </div>

        {/* Mobile: feedback del coach sotto la scacchiera. */}
        <div className="lg:hidden">
          <TrainerCoachCard
            t={t}
            enabled={coachOn}
            unavailable={coachUnavailable}
            item={coachItem}
            onToggle={toggleCoach}
          />
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
          <TrainerCoachCard
            t={t}
            enabled={coachOn}
            unavailable={coachUnavailable}
            item={coachItem}
            onToggle={toggleCoach}
          />
        </div>
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
  t: PlayTranslator,
): string | null {
  if (resigned) return t("sparring.status.resigned");
  if (game.isCheckmate) {
    // Sotto matto perde chi deve muovere.
    const loserIsUser = game.turn === userColor[0];
    return loserIsUser ? t("sparring.status.checkmateLost") : t("sparring.status.checkmateWon");
  }
  if (game.isStalemate) return t("sparring.status.stalemate");
  if (game.isDraw) return t("sparring.status.draw");
  return null;
}

/** Esito strutturato per la schermata finale (overlay sulla scacchiera). */
function sparringResult(
  game: ReturnType<typeof useChessGame>,
  userColor: Color,
  resigned: boolean,
  t: PlayTranslator,
): { title: string; subtitle?: string; checkmate: boolean; outcome: GameOutcome } | null {
  if (resigned)
    return { title: t("result.youLost"), subtitle: t("sparring.result.resignedGame"), checkmate: false, outcome: "loss" };
  if (game.isCheckmate) {
    // Sotto matto perde chi deve muovere.
    const loserIsUser = game.turn === userColor[0];
    return loserIsUser
      ? { title: t("result.youLost"), checkmate: true, outcome: "loss" }
      : { title: t("result.youWon"), checkmate: true, outcome: "win" };
  }
  if (game.isStalemate) return { title: t("result.draw"), subtitle: t("result.stalemate"), checkmate: false, outcome: "draw" };
  if (game.isDraw) return { title: t("result.draw"), checkmate: false, outcome: "draw" };
  return null;
}

/** Tipo del traduttore next-intl per il namespace "play", per i helper non-componenti. */
type PlayTranslator = ReturnType<typeof useTranslations<"play">>;

/** Pannello del coach di allenamento: cosa cambia sulla scacchiera con la tua mossa. */
function TrainerCoachCard({
  t,
  enabled,
  unavailable,
  item,
  onToggle,
}: {
  t: PlayTranslator;
  enabled: boolean;
  unavailable: boolean;
  item: { san: string; text: string; busy: boolean } | null;
  onToggle: () => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs uppercase tracking-wide text-text-muted">
          {t("sparring.coach.title")}
        </span>
        {!unavailable && (
          <button
            type="button"
            onClick={onToggle}
            className={cn(
              "rounded-md border px-2 py-0.5 text-xs transition-colors",
              enabled
                ? "border-text bg-text text-bg"
                : "border-border text-text-muted hover:text-text",
            )}
          >
            {enabled ? t("sparring.coach.on") : t("sparring.coach.off")}
          </button>
        )}
      </div>
      {unavailable ? (
        <p className="text-sm text-text-muted">{t("sparring.coach.unavailable")}</p>
      ) : !enabled ? null : item ? (
        <div className="space-y-1">
          <div className="font-mono text-xs text-text-muted">
            {t("sparring.coach.yourMove", { san: item.san })}
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {item.text || t("sparring.coach.observing")}
            {item.busy && item.text ? (
              <span className="ml-0.5 inline-block h-3 w-1 animate-pulse bg-text align-middle" aria-hidden />
            ) : null}
          </p>
        </div>
      ) : (
        <p className="text-sm text-text-muted">{t("sparring.coach.empty")}</p>
      )}
    </div>
  );
}

function MoveList({ history }: { history: ReturnType<typeof useChessGame>["history"] }) {
  const t = useTranslations("play");
  const rows: { no: number; white?: string; black?: string }[] = [];
  history.forEach((m, i) => {
    const no = Math.floor(i / 2) + 1;
    if (i % 2 === 0) rows.push({ no, white: m.san });
    else rows[rows.length - 1].black = m.san;
  });
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <div className="mb-2 text-xs uppercase tracking-wide text-text-muted">{t("moves")}</div>
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
  material,
}: {
  name: string;
  sub: string;
  active: boolean;
  note?: string;
  material?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-md border px-3 py-2 transition-colors",
        active ? "border-text bg-surface" : "border-border bg-surface-2",
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <span
          className={cn(
            "h-2 w-2 shrink-0 rounded-full",
            active ? "bg-text" : "bg-border",
          )}
          aria-hidden
        />
        <span className="truncate text-sm font-medium">{name}</span>
        <span className="shrink-0 text-xs text-text-muted">{sub}</span>
        {material}
      </div>
      {note && <span className="shrink-0 text-xs text-text-muted">{note}</span>}
    </div>
  );
}
