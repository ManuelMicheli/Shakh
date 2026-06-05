"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Clock, ChevronRight, Globe, Swords } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { findTimeControl } from "@/lib/play/time-controls";
import type { FriendGameRow } from "@/lib/play/types";
import { HotseatGame } from "./HotseatGame";
import { TimeControlPicker } from "./TimeControlPicker";
import { QuickMatch } from "./QuickMatch";
import { createOnlineGame } from "@/app/app/gioca/actions";

// Stessa scacchiera reale (chessground) usata in tutte le altre sezioni.
const ChessBoard = dynamic(
  () => import("@/components/chess/ChessBoard").then((m) => m.ChessBoard),
  { ssr: false },
);

type ColorChoice = "w" | "b" | "random";

export function PlayHub({
  myGames,
  currentUserId,
}: {
  myGames: FriendGameRow[];
  currentUserId: string;
}) {
  return (
    <>
      {/* Mobile / sotto md: layout impilato a tab (stesso dispositivo / online). */}
      <div className="md:hidden">
        <PlayHubMobile myGames={myGames} currentUserId={currentUserId} />
      </div>

      {/* Desktop (md+): layout "Table" — scacchiera a sinistra, configuratore a destra. */}
      <div className="hidden md:block">
        <PlayHubTable myGames={myGames} currentUserId={currentUserId} />
      </div>
    </>
  );
}

/* ============================================================
   Layout mobile — invariato: tab Stesso dispositivo / Online.
   ============================================================ */
function PlayHubMobile({
  myGames,
  currentUserId,
}: {
  myGames: FriendGameRow[];
  currentUserId: string;
}) {
  const t = useTranslations("play");
  return (
    <Tabs defaultValue="local">
      <TabsList>
        <TabsTrigger value="local">{t("hub.tabLocal")}</TabsTrigger>
        <TabsTrigger value="online">{t("hub.tabOnline")}</TabsTrigger>
      </TabsList>

      <TabsContent value="local">
        <HotseatGame />
      </TabsContent>

      <TabsContent value="online">
        <div className="space-y-6">
          <QuickMatch currentUserId={currentUserId} />
          <OrPrivateDivider />
          <div className="grid gap-6 lg:grid-cols-2">
            <CreateOnlineForm />
            <MyGames games={myGames} currentUserId={currentUserId} />
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}

/* ============================================================
   Layout desktop · TABLE
   Scacchiera (anteprima posizione iniziale) a sinistra; a destra il
   configuratore con tab Online/Stesso dispositivo, colore, tempo, crea, e
   sotto la lista delle partite. In modalità "stesso dispositivo" il
   configuratore lascia spazio all'hotseat reale.
   ============================================================ */
type PlayMode = "online" | "local";

function PlayHubTable({
  myGames,
  currentUserId,
}: {
  myGames: FriendGameRow[];
  currentUserId: string;
}) {
  const t = useTranslations("play");
  const [mode, setMode] = useState<PlayMode>("online");

  if (mode === "local") {
    return (
      <div className="space-y-4">
        <PlayModeTabs mode={mode} onChange={setMode} />
        <HotseatGame />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_24rem] gap-8">
      {/* Scacchiera reale (anteprima posizione iniziale, sola lettura) */}
      <div className="board-sized mx-auto w-full">
        <ChessBoard mode="view" />
        <p className="mt-3 text-center font-mono text-[11px] uppercase tracking-wide text-text-muted">
          {t("status.toMove", { side: t("color.white") })}
        </p>
      </div>

      {/* Configuratore */}
      <div className="space-y-4">
        <PlayModeTabs mode={mode} onChange={setMode} />
        <QuickMatch currentUserId={currentUserId} />
        <OrPrivateDivider />
        <CreateOnlineForm />
        <MyGames games={myGames} currentUserId={currentUserId} compact />
      </div>
    </div>
  );
}

function PlayModeTabs({
  mode,
  onChange,
}: {
  mode: PlayMode;
  onChange: (m: PlayMode) => void;
}) {
  const t = useTranslations("play");
  return (
    <div className="flex rounded-lg border border-border p-1">
      <button
        type="button"
        onClick={() => onChange("online")}
        aria-pressed={mode === "online"}
        className={cn(
          "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm transition-colors",
          mode === "online"
            ? "bg-surface-2 font-medium text-text"
            : "text-text-muted hover:text-text",
        )}
      >
        <Globe className="h-4 w-4" /> {t("hub.tabOnline")}
      </button>
      <button
        type="button"
        onClick={() => onChange("local")}
        aria-pressed={mode === "local"}
        className={cn(
          "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm transition-colors",
          mode === "local"
            ? "bg-surface-2 font-medium text-text"
            : "text-text-muted hover:text-text",
        )}
      >
        <Swords className="h-4 w-4" /> {t("hub.tabLocal")}
      </button>
    </div>
  );
}

function OrPrivateDivider() {
  const t = useTranslations("play");
  return (
    <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-text-muted">
      <span className="h-px flex-1 bg-border" />
      {t("quickMatch.orPrivate")}
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

function CreateOnlineForm() {
  const t = useTranslations("play");
  const router = useRouter();
  const { toast } = useToast();
  const [color, setColor] = useState<ColorChoice>("w");
  const [tcId, setTcId] = useState("10+0");
  const [pending, startTransition] = useTransition();

  const create = () => {
    startTransition(async () => {
      const res = await createOnlineGame({ color, timeControlId: tcId });
      if (!res.ok) {
        toast({ title: res.error, variant: "error" });
        return;
      }
      router.push(`/app/gioca/${res.data.id}`);
    });
  };

  const colors: { id: ColorChoice; label: string }[] = [
    { id: "w", label: t("color.white") },
    { id: "b", label: t("color.black") },
    { id: "random", label: t("color.random") },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("create.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm text-text-muted">
          {t("create.desc")}
        </p>
        <div>
          <div className="mb-2 text-xs uppercase tracking-wide text-text-muted">
            {t("create.yourColor")}
          </div>
          <div className="flex flex-wrap gap-2">
            {colors.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setColor(c.id)}
                aria-pressed={color === c.id}
                className={cn(
                  "flex-1 rounded-md border px-3 py-1.5 text-sm transition-colors",
                  color === c.id
                    ? "border-text bg-text text-bg"
                    : "border-border text-text-muted hover:text-text",
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-2 flex items-center gap-1.5 text-xs uppercase tracking-wide text-text-muted">
            <Clock className="h-3.5 w-3.5" /> {t("timeControl")}
          </div>
          <TimeControlPicker value={tcId} onChange={setTcId} />
        </div>
        <Button onClick={create} disabled={pending} className="w-full">
          {pending ? t("create.creating") : t("create.submit")}
          {!pending && <ChevronRight className="h-4 w-4" />}
        </Button>
      </CardContent>
    </Card>
  );
}

function MyGames({
  games,
  currentUserId,
  compact = false,
}: {
  games: FriendGameRow[];
  currentUserId: string;
  compact?: boolean;
}) {
  const t = useTranslations("play");
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("myGames.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        {games.length === 0 ? (
          <p className="text-sm text-text-muted">
            {t("myGames.empty")}
          </p>
        ) : (
          <ul className={cn("divide-y divide-border", compact && "-my-1")}>
            {games.map((g) => {
              const myColor = g.white_user_id === currentUserId ? "w" : "b";
              const oppName =
                myColor === "w" ? g.black_name : g.white_name;
              const tc = findTimeControl(timeControlIdFromRow(g));
              return (
                <li key={g.id}>
                  <Link
                    href={`/app/gioca/${g.id}`}
                    className="flex items-center justify-between gap-3 py-2.5 transition-colors hover:text-text"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm">
                        {t("myGames.vs", { name: oppName ?? t("myGames.waiting") })}
                      </span>
                      <span className="block font-mono text-xs text-text-muted">
                        {myColor === "w" ? t("color.white") : t("color.black")} · {tc.label}
                      </span>
                    </span>
                    <StatusBadge g={g} />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ g }: { g: FriendGameRow }) {
  const t = useTranslations("play");
  if (g.status === "waiting") return <Badge variant="muted">{t("status.waiting")}</Badge>;
  if (g.status === "ongoing") return <Badge>{t("status.inProgress")}</Badge>;
  return <Badge variant="muted">{g.result ?? t("status.over")}</Badge>;
}

/** Ricostruisce l'id del controllo di tempo dai ms salvati (best-effort per la label). */
function timeControlIdFromRow(g: FriendGameRow): string {
  if (g.initial_ms == null) return "unlimited";
  const min = Math.round(g.initial_ms / 60_000);
  const inc = Math.round(g.increment_ms / 1000);
  return `${min}+${inc}`;
}
