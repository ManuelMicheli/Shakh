"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import {
  importPgnText,
  importLichess,
  importChesscom,
  type ImportResult,
} from "@/app/app/partite/actions";

/** Notifica l'esito di un import e aggiorna la lista. */
function useImportFeedback() {
  const { toast } = useToast();
  const router = useRouter();
  return (res: ImportResult) => {
    if (!res.ok) {
      toast({ title: "Import non riuscito", description: res.error, variant: "error" });
      return;
    }
    const parts = [`${res.imported ?? 0} importate`];
    if (res.skipped) parts.push(`${res.skipped} duplicate ignorate`);
    toast({
      title: res.imported ? "Partite importate" : "Nessuna nuova partita",
      description: parts.join(" · "),
      variant: "success",
    });
    router.refresh();
  };
}

export function ImportPanel() {
  const [pgn, setPgn] = useState("");
  const [username, setUsername] = useState("");
  const [max, setMax] = useState(10);
  const [ccUser, setCcUser] = useState("");
  const [ccMax, setCcMax] = useState(10);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
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
      toast({ title: "Lettura file non riuscita", variant: "error" });
    }
  };

  const submitLichess = () => {
    startTransition(async () => feedback(await importLichess(username, max)));
  };

  const submitChesscom = () => {
    startTransition(async () => feedback(await importChesscom(ccUser, ccMax)));
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <Tabs defaultValue="chesscom">
          <TabsList>
            <TabsTrigger value="chesscom">Chess.com</TabsTrigger>
            <TabsTrigger value="lichess">Lichess</TabsTrigger>
            <TabsTrigger value="file">File .pgn</TabsTrigger>
            <TabsTrigger value="pgn">Incolla PGN</TabsTrigger>
          </TabsList>

          {/* Incolla PGN */}
          <TabsContent value="pgn" className="space-y-3">
            <Label htmlFor="pgn-input">Uno o più giochi in formato PGN</Label>
            <textarea
              id="pgn-input"
              value={pgn}
              onChange={(e) => setPgn(e.target.value)}
              rows={8}
              placeholder={`[Event "..."]\n[White "..."]\n\n1. e4 e5 2. Nf3 ...`}
              className="w-full rounded-md border border-border bg-surface-2 p-2 font-mono text-xs text-text focus-visible:outline-2 focus-visible:outline-offset-2"
            />
            <Button onClick={() => submitPgn(pgn)} disabled={pending || !pgn.trim()}>
              {pending ? "Importazione…" : "Importa PGN"}
            </Button>
          </TabsContent>

          {/* File .pgn */}
          <TabsContent value="file" className="space-y-3">
            <p className="text-sm text-text-muted">
              Carica un file <code className="font-mono">.pgn</code> (anche con più partite).
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
              {pending ? "Importazione…" : "Scegli file"}
            </Button>
          </TabsContent>

          {/* Lichess */}
          <TabsContent value="lichess" className="space-y-3">
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="li-user">Username Lichess</Label>
                <Input
                  id="li-user"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="es. DrNykterstein"
                  className="w-56"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="li-max">Quante</Label>
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
                {pending ? "Scaricamento…" : "Importa da Lichess"}
              </Button>
            </div>
            <p className="text-xs text-text-muted">
              Scarica le ultime partite pubbliche dell&apos;utente tramite l&apos;API di Lichess.
            </p>
          </TabsContent>

          {/* Chess.com */}
          <TabsContent value="chesscom" className="space-y-3">
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cc-user">Username Chess.com</Label>
                <Input
                  id="cc-user"
                  value={ccUser}
                  onChange={(e) => setCcUser(e.target.value)}
                  placeholder="es. MagnusCarlsen"
                  className="w-56"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cc-max">Quante</Label>
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
                {pending ? "Scaricamento…" : "Importa da Chess.com"}
              </Button>
            </div>
            <p className="text-xs text-text-muted">
              Scarica le partite pubbliche più recenti dell&apos;utente tramite l&apos;API di Chess.com.
            </p>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
