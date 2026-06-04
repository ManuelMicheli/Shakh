"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Upload, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import {
  importPgnText,
  importLichess,
  importChesscom,
  type ImportResult,
} from "@/app/app/partite/actions";
import { useAnalysisJob } from "@/components/analysis/AnalysisJobContext";

/** Notifica l'esito di un import, aggiorna la lista e avvia l'analisi del campione. */
function useImportFeedback() {
  const { toast } = useToast();
  const router = useRouter();
  const { startBatch } = useAnalysisJob();
  return (res: ImportResult) => {
    if (!res.ok) {
      toast({ title: "Import failed", description: res.error, variant: "error" });
      return;
    }
    const parts = [`${res.imported ?? 0} imported`];
    if (res.skipped) parts.push(`${res.skipped} duplicates skipped`);
    toast({
      title: res.imported ? "Games imported" : "No new games",
      description: parts.join(" · "),
      variant: "success",
    });
    router.refresh();

    // Bootstrap diagnostica: avvia subito l'analisi di un piccolo campione delle
    // partite appena importate (gira in background nel pool di worker).
    const queue = res.analyzeQueue ?? [];
    if (queue.length > 0) {
      const n = startBatch(queue);
      if (n > 0) {
        toast({
          title: "Analysis started",
          description:
            n > 1
              ? `${n} games being analyzed in the background for your weak points.`
              : "1 game being analyzed in the background for your weak points.",
        });
      }
    }
  };
}

/** Avviso: verifica account per far contare le partite nel profilo. */
function VerifyNotice() {
  return (
    <div className="flex items-start gap-3 rounded-md border border-border bg-surface-2 p-3 text-sm">
      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-text-muted" />
      <div className="space-y-0.5">
        <p className="text-text">
          Verify your account to make games count toward your profile.
        </p>
        <p className="text-text-muted">
          Only games from your verified account feed weak points,
          Shakh Rating, and statistics. You can still import other players&apos;
          games: they stay browsable and analyzable, but don&apos;t touch your
          profile.{" "}
          <Link
            href="/app/profilo"
            className="font-medium text-text underline underline-offset-2 hover:no-underline"
          >
            Verify account →
          </Link>
        </p>
      </div>
    </div>
  );
}

export function ImportPanel({
  hasVerifiedAccount = false,
}: {
  /** Se l'utente ha un account online verificato; in caso contrario, invita a verificarlo. */
  hasVerifiedAccount?: boolean;
}) {
  const [pgn, setPgn] = useState("");
  const [username, setUsername] = useState("");
  const [max, setMax] = useState(10);
  const [ccUser, setCcUser] = useState("");
  const [ccMax, setCcMax] = useState(10);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  // Tab della mini-tab mobile (md-): Chess.com → Lichess → Importa (PGN/file).
  const [mtab, setMtab] = useState<"chesscom" | "lichess" | "import">("chesscom");
  const mFileRef = useRef<HTMLInputElement>(null);
  const feedback = useImportFeedback();
  const { toast } = useToast();

  const submitPgn = (text: string) => {
    startTransition(async () => feedback(await importPgnText(text)));
  };

  const onFile = async (file: File) => {
    try {
      const text = await file.text();
      submitPgn(text);
    } catch {
      toast({ title: "Couldn't read the file", variant: "error" });
    }
  };

  const submitLichess = () => {
    startTransition(async () => feedback(await importLichess(username, max)));
  };

  const submitChesscom = () => {
    startTransition(async () => feedback(await importChesscom(ccUser, ccMax)));
  };

  return (
    <>
      {/* MOBILE: mini-tab compatta — Chess.com → Lichess → Importa — + barra input. */}
      <div className="space-y-3 md:hidden">
        {!hasVerifiedAccount && <VerifyNotice />}
        <div className="space-y-3 rounded-xl border border-border bg-surface p-3">
          <div className="flex gap-1 rounded-lg bg-surface-2 p-1">
            {(
              [
                ["chesscom", "Chess.com"],
                ["lichess", "Lichess"],
                ["import", "Import"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setMtab(id)}
                className={cn(
                  "flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                  mtab === id ? "bg-text text-bg" : "text-text-muted hover:text-text",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {mtab === "chesscom" && (
            <div className="flex items-center gap-2">
              <Input
                value={ccUser}
                onChange={(e) => setCcUser(e.target.value)}
                placeholder="Chess.com username"
                className="min-w-0 flex-1"
              />
              <Button
                onClick={submitChesscom}
                disabled={pending || !ccUser.trim()}
                className="shrink-0"
              >
                {pending ? "…" : "Import"}
              </Button>
            </div>
          )}

          {mtab === "lichess" && (
            <div className="flex items-center gap-2">
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Lichess username"
                className="min-w-0 flex-1"
              />
              <Button
                onClick={submitLichess}
                disabled={pending || !username.trim()}
                className="shrink-0"
              >
                {pending ? "…" : "Import"}
              </Button>
            </div>
          )}

          {mtab === "import" && (
            <div className="space-y-2">
              <textarea
                value={pgn}
                onChange={(e) => setPgn(e.target.value)}
                rows={5}
                placeholder={`[Event "..."]\n1. e4 e5 2. Nf3 ...`}
                className="w-full rounded-lg border border-border bg-surface-2 p-2 font-mono text-xs text-text focus-visible:outline-2 focus-visible:outline-offset-2"
              />
              <div className="flex gap-2">
                <Button
                  onClick={() => submitPgn(pgn)}
                  disabled={pending || !pgn.trim()}
                  className="flex-1"
                >
                  {pending ? "…" : "Import PGN"}
                </Button>
                <input
                  ref={mFileRef}
                  type="file"
                  accept=".pgn,application/x-chess-pgn,text/plain"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onFile(f);
                    e.target.value = "";
                  }}
                />
                <Button
                  variant="secondary"
                  onClick={() => mFileRef.current?.click()}
                  disabled={pending}
                  className="shrink-0"
                >
                  <Upload className="h-4 w-4" /> File
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* DESKTOP: pannello completo a quattro schede. */}
      <Card className="hidden md:block">
        <CardContent className="space-y-4 pt-6">
          {!hasVerifiedAccount && <VerifyNotice />}
          <Tabs defaultValue="chesscom">
          <TabsList className="flex flex-wrap">
            <TabsTrigger value="chesscom">Chess.com</TabsTrigger>
            <TabsTrigger value="lichess">Lichess</TabsTrigger>
            <TabsTrigger value="file">.pgn file</TabsTrigger>
            <TabsTrigger value="pgn">Paste PGN</TabsTrigger>
          </TabsList>

          {/* Incolla PGN */}
          <TabsContent value="pgn" className="space-y-3">
            <Label htmlFor="pgn-input">One or more games in PGN format</Label>
            <textarea
              id="pgn-input"
              value={pgn}
              onChange={(e) => setPgn(e.target.value)}
              rows={8}
              placeholder={`[Event "..."]\n[White "..."]\n\n1. e4 e5 2. Nf3 ...`}
              className="w-full rounded-md border border-border bg-surface-2 p-2 font-mono text-xs text-text focus-visible:outline-2 focus-visible:outline-offset-2"
            />
            <Button onClick={() => submitPgn(pgn)} disabled={pending || !pgn.trim()}>
              {pending ? "Importing…" : "Import PGN"}
            </Button>
          </TabsContent>

          {/* File .pgn */}
          <TabsContent value="file" className="space-y-3">
            <p className="text-sm text-text-muted">
              Upload a <code className="font-mono">.pgn</code> file (multiple games are fine too).
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".pgn,application/x-chess-pgn,text/plain"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFile(f);
                e.target.value = "";
              }}
            />
            <Button
              variant="secondary"
              onClick={() => fileRef.current?.click()}
              disabled={pending}
            >
              <Upload className="h-4 w-4" />
              {pending ? "Importing…" : "Choose file"}
            </Button>
          </TabsContent>

          {/* Lichess */}
          <TabsContent value="lichess" className="space-y-3">
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="li-user">Lichess username</Label>
                <Input
                  id="li-user"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. DrNykterstein"
                  className="w-56"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="li-max">How many</Label>
                <Input
                  id="li-max"
                  type="number"
                  min={1}
                  max={100}
                  value={max}
                  onChange={(e) => setMax(Number(e.target.value))}
                  className="w-24"
                />
              </div>
              <Button
                onClick={submitLichess}
                disabled={pending || !username.trim()}
              >
                {pending ? "Downloading…" : "Import from Lichess"}
              </Button>
            </div>
            <p className="text-xs text-text-muted">
              Downloads the user&apos;s latest public games via the Lichess API.
            </p>
          </TabsContent>

          {/* Chess.com */}
          <TabsContent value="chesscom" className="space-y-3">
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cc-user">Chess.com username</Label>
                <Input
                  id="cc-user"
                  value={ccUser}
                  onChange={(e) => setCcUser(e.target.value)}
                  placeholder="e.g. MagnusCarlsen"
                  className="w-56"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cc-max">How many</Label>
                <Input
                  id="cc-max"
                  type="number"
                  min={1}
                  max={100}
                  value={ccMax}
                  onChange={(e) => setCcMax(Number(e.target.value))}
                  className="w-24"
                />
              </div>
              <Button
                onClick={submitChesscom}
                disabled={pending || !ccUser.trim()}
              >
                {pending ? "Downloading…" : "Import from Chess.com"}
              </Button>
            </div>
            <p className="text-xs text-text-muted">
              Downloads the user&apos;s most recent public games via the Chess.com API.
            </p>
          </TabsContent>
        </Tabs>
        </CardContent>
      </Card>
    </>
  );
}
