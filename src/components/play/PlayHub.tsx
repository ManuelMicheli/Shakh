"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import { createOnlineGame } from "@/app/app/gioca/actions";

type ColorChoice = "w" | "b" | "random";

export function PlayHub({
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
        <div className="grid gap-6 lg:grid-cols-2">
          <CreateOnlineForm />
          <MyGames games={myGames} currentUserId={currentUserId} />
        </div>
      </TabsContent>
    </Tabs>
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
                  "rounded-md border px-3 py-1.5 text-sm transition-colors",
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
          <div className="mb-2 text-xs uppercase tracking-wide text-text-muted">
            {t("timeControl")}
          </div>
          <TimeControlPicker value={tcId} onChange={setTcId} />
        </div>
        <Button onClick={create} disabled={pending}>
          {pending ? t("create.creating") : t("create.submit")}
        </Button>
      </CardContent>
    </Card>
  );
}

function MyGames({
  games,
  currentUserId,
}: {
  games: FriendGameRow[];
  currentUserId: string;
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
          <ul className="divide-y divide-border">
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
