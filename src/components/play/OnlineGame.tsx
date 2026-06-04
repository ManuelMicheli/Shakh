"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Chess, type Square, type PieceSymbol } from "chess.js";
import {
  Check,
  Copy,
  Handshake,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  MoreVertical,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { legalDestsForFen } from "@/lib/chess/legal";
import type { FriendGameRow } from "@/lib/play/types";
import type { HistoryMove } from "@/lib/chess/useChessGame";
import { BoardControls } from "@/components/chess/BoardControls";
import { MoveList } from "@/components/chess/MoveList";
import { MoveStripH } from "@/components/chess/MoveStripH";
import { GameClock } from "./GameClock";
import { GameOverOverlay, type GameOutcome } from "./GameOverOverlay";
import { gameStatsFromFen, formatDuration } from "@/lib/chess/summary";
import { ConfirmResignButton } from "./ConfirmResignButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import {
  makeOnlineMove,
  joinOnlineGame,
  resignOnlineGame,
  offerDrawOnline,
  respondDrawOnline,
  claimTimeoutOnline,
} from "@/app/app/gioca/actions";

const ChessBoard = dynamic(
  () => import("@/components/chess/ChessBoard").then((m) => m.ChessBoard),
  { ssr: false },
);

export interface OnlineGameProps {
  initialGame: FriendGameRow;
  currentUserId: string;
}

export function OnlineGame({ initialGame, currentUserId }: OnlineGameProps) {
  const { toast } = useToast();
  const [game, setGame] = useState<FriendGameRow>(initialGame);
  const [follow, setFollow] = useState(true);
  const [manualCursor, setManualCursor] = useState(initialGame.moves.length - 1);
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [overlayOff, setOverlayOff] = useState(false);
  const claimedRef = useRef(false);
  const boardWrapRef = useRef<HTMLDivElement>(null);
  const latestStampRef = useRef<string>(initialGame.updated_at);
  const statusRef = useRef<FriendGameRow["status"]>(initialGame.status);

  // Applica una riga ignorando stati più vecchi (poll o eventi fuori ordine):
  // evita che la scacchiera "torni indietro" per una lettura in ritardo.
  const applyRow = useCallback((row: FriendGameRow) => {
    if (
      row.updated_at &&
      latestStampRef.current &&
      row.updated_at < latestStampRef.current
    ) {
      return;
    }
    latestStampRef.current = row.updated_at ?? latestStampRef.current;
    claimedRef.current = false;
    statusRef.current = row.status;
    setGame(row);
  }, []);

  const myColor: "w" | "b" | null =
    game.white_user_id === currentUserId
      ? "w"
      : game.black_user_id === currentUserId
        ? "b"
        : null;
  const isPlayer = myColor != null;
  const bothJoined = !!game.white_user_id && !!game.black_user_id;

  const liveIndex = game.moves.length - 1;
  const cursor = follow ? liveIndex : Math.min(manualCursor, liveIndex);
  const atLive = cursor >= liveIndex;
  const viewFen = cursor < 0 ? game.start_fen : game.moves[cursor].fen;

  // ---- Realtime: sincronizza la riga della partita ----
  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const refetch = async () => {
      const { data } = await supabase
        .from("friend_games")
        .select("*")
        .eq("id", initialGame.id)
        .maybeSingle();
      if (data && !cancelled) applyRow(data as FriendGameRow);
    };

    (async () => {
      // Il websocket Realtime DEVE avere il JWT utente: appena la partita passa
      // da 'waiting' a 'ongoing', la RLS richiede auth.uid() per leggere la riga.
      // Senza token il socket è anonimo → nessun evento (il bug del "ricarica").
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session?.access_token) {
        supabase.realtime.setAuth(session.access_token);
      }

      channel = supabase
        .channel(`friend_game:${initialGame.id}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "friend_games",
            filter: `id=eq.${initialGame.id}`,
          },
          (payload) => applyRow(payload.new as FriendGameRow),
        )
        .subscribe((status) => {
          // Riallinea appena il canale è attivo (recupera i cambi avvenuti
          // tra il render server e la sottoscrizione).
          if (status === "SUBSCRIBED") refetch();
        });
    })();

    // La tab tornata visibile può aver perso eventi mentre il socket dormiva.
    const onVisible = () => {
      if (document.visibilityState === "visible") refetch();
    };
    document.addEventListener("visibilitychange", onVisible);

    // Rete di sicurezza: poll leggero finché la partita è viva, nel caso il
    // websocket cada. Realtime resta il canale primario (istantaneo).
    const poll = setInterval(() => {
      if (statusRef.current !== "finished") refetch();
    }, 4000);

    return () => {
      cancelled = true;
      clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
      if (channel) supabase.removeChannel(channel);
    };
  }, [initialGame.id, applyRow]);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const canMove =
    game.status === "ongoing" && isPlayer && game.turn === myColor && atLive;

  const onMove = useCallback(
    async (from: Square, to: Square, promotion?: PieceSymbol) => {
      if (!canMove) return;
      const res = await makeOnlineMove(initialGame.id, from, to, promotion);
      if (!res.ok) {
        toast({ title: res.error, variant: "error" });
        return;
      }
      setFollow(true);
      applyRow(res.data);
    },
    [canMove, initialGame.id, toast, applyRow],
  );

  const onJoin = async () => {
    const res = await joinOnlineGame(initialGame.id);
    if (!res.ok) {
      toast({ title: res.error, variant: "error" });
      return;
    }
    applyRow(res.data);
  };

  const onResign = async () => {
    const res = await resignOnlineGame(initialGame.id);
    if (!res.ok) toast({ title: res.error, variant: "error" });
    else applyRow(res.data);
  };

  const onOfferDraw = async () => {
    const res = await offerDrawOnline(initialGame.id);
    if (!res.ok) toast({ title: res.error, variant: "error" });
    else {
      applyRow(res.data);
      toast({ title: "Patta proposta" });
    }
  };

  const onRespondDraw = async (accept: boolean) => {
    const res = await respondDrawOnline(initialGame.id, accept);
    if (!res.ok) toast({ title: res.error, variant: "error" });
    else applyRow(res.data);
  };

  const onFlag = useCallback(() => {
    if (claimedRef.current) return;
    claimedRef.current = true;
    claimTimeoutOnline(initialGame.id).then((res) => {
      if (res.ok) applyRow(res.data);
    });
  }, [initialGame.id, applyRow]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${origin}/app/gioca/${initialGame.id}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast({ title: "Copia non riuscita", variant: "error" });
    }
  };

  // Navigazione (rivedere le mosse precedenti / tornare al vivo).
  const goTo = (i: number) => {
    if (i >= liveIndex) setFollow(true);
    else {
      setFollow(false);
      setManualCursor(Math.max(-1, i));
    }
  };
  const prev = () => goTo(cursor - 1);
  const next = () => goTo(cursor + 1);
  const first = () => goTo(-1);
  const last = () => setFollow(true);

  const orientation: "white" | "black" = myColor === "b" ? "black" : "white";
  const topColor: "w" | "b" = myColor === "b" ? "w" : "b";
  const bottomColor: "w" | "b" = myColor === "b" ? "b" : "w";

  const history: HistoryMove[] = game.moves.map((m, i) => ({
    san: m.san,
    from: m.from,
    to: m.to,
    promotion: m.promotion,
    fen: m.fen,
    ply: i + 1,
  }));

  const lastMove =
    cursor >= 0 ? ([game.moves[cursor].from, game.moves[cursor].to] as [Square, Square]) : null;
  const viewInCheck = inCheck(viewFen);

  const clockRunning = (c: "w" | "b") =>
    game.status === "ongoing" && bothJoined && game.turn === c && game.initial_ms != null;
  const sinceTs = game.last_move_at ? Date.parse(game.last_move_at) : null;
  const nameOf = (c: "w" | "b") =>
    c === "w" ? game.white_name ?? "Bianco" : game.black_name ?? "Nero";
  const msOf = (c: "w" | "b") => (c === "w" ? game.white_ms : game.black_ms);

  const drawOfferToMe =
    game.status === "ongoing" &&
    isPlayer &&
    game.draw_offer_by != null &&
    game.draw_offer_by !== myColor;

  return (
    <div className="space-y-4">
      {/* Avvisi essenziali: visibili su ogni schermo (in cima su mobile). */}
      {game.status === "waiting" && (
        <Card>
          <CardHeader>
            <CardTitle>
              {isPlayer ? "In attesa dell'avversario" : "Unisciti alla partita"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isPlayer ? (
              <>
                <p className="text-sm text-text-muted">
                  Condividi questo link con il tuo amico. Dovrà accedere per
                  giocare.
                </p>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={`${origin}/app/gioca/${initialGame.id}`}
                    className="min-w-0 flex-1 rounded-md border border-border bg-surface-2 px-2 py-1.5 font-mono text-xs text-text"
                  />
                  <Button variant="secondary" size="sm" onClick={copyLink}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? "Copiato" : "Copia"}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-text-muted">
                  Sei stato invitato a giocare. Entra come{" "}
                  {game.white_user_id ? "Nero" : "Bianco"}.
                </p>
                <Button onClick={onJoin}>Unisciti</Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {drawOfferToMe && (
        <Card>
          <CardHeader>
            <CardTitle>Proposta di patta</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button size="sm" onClick={() => onRespondDraw(true)}>
              Accetta
            </Button>
            <Button variant="secondary" size="sm" onClick={() => onRespondDraw(false)}>
              Rifiuta
            </Button>
          </CardContent>
        </Card>
      )}

      {game.status === "finished" && (
        <Card>
          <CardHeader>
            <CardTitle>Partita conclusa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Badge variant="muted">{outcomeText(game)}</Badge>
            <div>
              <Link href="/app/gioca">
                <Button variant="secondary" size="sm">
                  Nuova partita
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="lg:grid lg:gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] 2xl:grid-cols-[auto_20rem] 2xl:justify-center">
        <div className="board-sized lg:mx-auto lg:w-full lg:max-w-none">
          {/* Board piena su mobile (orologi sopra/sotto). Desktop: stessa colonna. */}
          <div className="space-y-3">
            <GameClock
              name={nameOf(topColor)}
              ms={msOf(topColor)}
              running={clockRunning(topColor)}
              sinceTs={sinceTs}
              active={game.status === "ongoing" && game.turn === topColor}
              onFlag={onFlag}
            />
            <div
              ref={boardWrapRef}
              tabIndex={0}
              className="relative rounded-md outline-none focus-visible:ring-2 focus-visible:ring-text"
            >
              <ChessBoard
                fen={viewFen}
                orientation={orientation}
                mode={canMove ? "play" : "view"}
                movableColor={myColor === "b" ? "black" : "white"}
                dests={canMove ? legalDestsForFen(game.fen) : new Map()}
                lastMove={lastMove}
                check={viewInCheck}
                onMove={onMove}
              />
              {game.status === "finished" && !overlayOff && (() => {
                const r = onlineResult(game, myColor);
                // Base dalla FEN + durata se la partita ha orologio.
                const stats =
                  game.initial_ms != null && game.white_ms != null && game.black_ms != null
                    ? [
                        ...gameStatsFromFen(game.fen),
                        {
                          label: "Durata",
                          value: formatDuration(
                            game.initial_ms * 2 +
                              game.increment_ms * game.moves.length -
                              (game.white_ms + game.black_ms),
                          ),
                        },
                      ]
                    : gameStatsFromFen(game.fen);
                return (
                  <GameOverOverlay
                    title={r.title}
                    subtitle={r.subtitle}
                    checkmate={r.checkmate}
                    outcome={r.outcome}
                    stats={stats}
                    onDismiss={() => setOverlayOff(true)}
                    actions={
                      <Link href="/app/gioca">
                        <Button size="sm" className="w-full">
                          Nuova partita
                        </Button>
                      </Link>
                    }
                  />
                );
              })()}
            </div>
            <GameClock
              name={nameOf(bottomColor)}
              ms={msOf(bottomColor)}
              running={clockRunning(bottomColor)}
              sinceTs={sinceTs}
              active={game.status === "ongoing" && game.turn === bottomColor}
              onFlag={onFlag}
            />

            {/* Desktop: controlli completi + stato. */}
            <div className="hidden items-center justify-between gap-3 lg:flex">
              <BoardControls
                onFirst={first}
                onPrev={prev}
                onNext={next}
                onLast={last}
                onFlip={() => {}}
                atStart={cursor < 0}
                atEnd={atLive}
                keyboardTarget={boardWrapRef}
              />
              <span className="font-mono text-sm text-text-muted">
                {statusText(game)}
              </span>
            </div>
          </div>

          {/* Mobile: striscia mosse orizzontale sotto la scacchiera. */}
          {history.length > 0 && (
            <div className="mt-2 lg:hidden">
              <MoveStripH history={history} cursor={cursor} onSelect={goTo} />
            </div>
          )}

          {/* Mobile: barra controlli — inizio / indietro / avanti / fine + menu. */}
          <div className="relative mt-2 flex items-center gap-2 lg:hidden">
            <Button
              variant="secondary"
              size="icon"
              className="flex-1"
              onClick={first}
              disabled={cursor < 0}
              aria-label="Prima mossa"
            >
              <ChevronsLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="flex-1"
              onClick={prev}
              disabled={cursor < 0}
              aria-label="Mossa precedente"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="flex-1"
              onClick={next}
              disabled={atLive}
              aria-label="Mossa successiva"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="flex-1"
              onClick={last}
              disabled={atLive}
              aria-label="Ultima mossa"
            >
              <ChevronsRight className="h-5 w-5" />
            </Button>

            {game.status === "ongoing" && isPlayer && (
              <div className="relative">
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-label="Azioni partita"
                  aria-expanded={menuOpen}
                >
                  <MoreVertical className="h-5 w-5" />
                </Button>
                {menuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      aria-hidden
                      onClick={() => setMenuOpen(false)}
                    />
                    <div className="absolute bottom-full right-0 z-50 mb-2 w-48 space-y-1 rounded-md border border-border bg-surface p-1 shadow-lg">
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          onOfferDraw();
                        }}
                        disabled={game.draw_offer_by === myColor}
                        className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-sm hover:bg-surface-2 disabled:opacity-50"
                      >
                        <Handshake className="h-4 w-4" />
                        {game.draw_offer_by === myColor
                          ? "Patta proposta"
                          : "Proponi patta"}
                      </button>
                      <ConfirmResignButton
                        onConfirm={() => {
                          setMenuOpen(false);
                          onResign();
                        }}
                        className="w-full justify-start"
                      />
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <aside className="hidden space-y-4 lg:block">
          {/* Azioni di partita (desktop). */}
          {game.status === "ongoing" && isPlayer && (
            <div className="flex flex-wrap gap-2">
              <ConfirmResignButton onConfirm={onResign} />
              <Button
                variant="secondary"
                size="sm"
                onClick={onOfferDraw}
                disabled={game.draw_offer_by === myColor}
              >
                <Handshake className="h-4 w-4" />
                {game.draw_offer_by === myColor ? "Patta proposta" : "Proponi patta"}
              </Button>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Mosse</CardTitle>
            </CardHeader>
            <CardContent>
              <MoveList
                history={history}
                cursor={cursor}
                onSelect={goTo}
                className="max-h-72"
              />
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function inCheck(fen: string): boolean {
  try {
    return new Chess(fen).isCheck();
  } catch {
    return false;
  }
}

function statusText(g: FriendGameRow): string {
  if (g.status === "waiting") return "In attesa…";
  if (g.status === "finished") return outcomeText(g);
  const side = g.turn === "w" ? "Bianco" : "Nero";
  return `Muove il ${side}`;
}

function outcomeText(g: FriendGameRow): string {
  const reason: Record<string, string> = {
    checkmate: "scacco matto",
    resign: "abbandono",
    timeout: "tempo scaduto",
    stalemate: "stallo",
    draw: "patta",
    agreement: "patta concordata",
    aborted: "annullata",
  };
  const r = g.end_reason ? ` (${reason[g.end_reason] ?? g.end_reason})` : "";
  if (g.result === "1-0") return `Vince il Bianco${r}`;
  if (g.result === "0-1") return `Vince il Nero${r}`;
  if (g.result === "1/2-1/2") return `Patta${r}`;
  return "Conclusa";
}

/** Esito strutturato per la schermata finale (overlay sulla scacchiera). */
function onlineResult(
  g: FriendGameRow,
  myColor: "w" | "b" | null,
): { title: string; subtitle?: string; checkmate: boolean; outcome?: GameOutcome } {
  const checkmate = g.end_reason === "checkmate";
  // Sottotitolo col motivo, tranne il matto (mostrato come simbolo).
  const reason: Record<string, string> = {
    resign: "Abbandono.",
    timeout: "Tempo scaduto.",
    stalemate: "Stallo.",
    agreement: "Patta concordata.",
    aborted: "Partita annullata.",
  };
  const subtitle = g.end_reason && !checkmate ? reason[g.end_reason] : undefined;

  if (g.result === "1/2-1/2") return { title: "Patta", subtitle, checkmate: false, outcome: "draw" };

  // Spettatore (non sei un giocatore): mostra il colore vincente.
  if (!myColor) {
    const decisive = g.result === "1-0" || g.result === "0-1";
    const title = g.result === "1-0" ? "Vince il Bianco" : g.result === "0-1" ? "Vince il Nero" : "Conclusa";
    return { title, subtitle, checkmate, outcome: decisive ? "win" : undefined };
  }

  const iWon =
    (g.result === "1-0" && myColor === "w") || (g.result === "0-1" && myColor === "b");
  return { title: iWon ? "Hai vinto" : "Hai perso", subtitle, checkmate, outcome: iWon ? "win" : "loss" };
}
