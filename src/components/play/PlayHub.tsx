"use client";

import { useState, useTransition } from "react";
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
  return (
    <Tabs defaultValue="local">
      <TabsList>
        <TabsTrigger value="local">Same device</TabsTrigger>
        <TabsTrigger value="online">Online (turn-based)</TabsTrigger>
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
    { id: "w", label: "White" },
    { id: "b", label: "Black" },
    { id: "random", label: "Random" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>New online game</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm text-text-muted">
          Create the game, share the link with a friend, and play whenever you
          like: moves sync in real time.
        </p>
        <div>
          <div className="mb-2 text-xs uppercase tracking-wide text-text-muted">
            Your color
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
            Time control
          </div>
          <TimeControlPicker value={tcId} onChange={setTcId} />
        </div>
        <Button onClick={create} disabled={pending}>
          {pending ? "Creating…" : "Create and get the link"}
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
  return (
    <Card>
      <CardHeader>
        <CardTitle>Your online games</CardTitle>
      </CardHeader>
      <CardContent>
        {games.length === 0 ? (
          <p className="text-sm text-text-muted">
            No online games yet. Create one to get started.
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
                        vs {oppName ?? "waiting…"}
                      </span>
                      <span className="block font-mono text-xs text-text-muted">
                        {myColor === "w" ? "White" : "Black"} · {tc.label}
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
  if (g.status === "waiting") return <Badge variant="muted">waiting</Badge>;
  if (g.status === "ongoing") return <Badge>in progress</Badge>;
  return <Badge variant="muted">{g.result ?? "over"}</Badge>;
}

/** Ricostruisce l'id del controllo di tempo dai ms salvati (best-effort per la label). */
function timeControlIdFromRow(g: FriendGameRow): string {
  if (g.initial_ms == null) return "unlimited";
  const min = Math.round(g.initial_ms / 60_000);
  const inc = Math.round(g.increment_ms / 1000);
  return `${min}+${inc}`;
}
