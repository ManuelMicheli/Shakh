"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Globe, Loader2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { TIME_CONTROLS, findTimeControl } from "@/lib/play/time-controls";
import type { MatchmakingRow } from "@/lib/play/types";
import { enqueueMatch, cancelMatch } from "@/app/app/gioca/actions";

// Preset rapidi per il quick-match (sottoinsieme di TIME_CONTROLS, raggruppati).
const PRESET_IDS = ["1+0", "2+1", "3+0", "3+2", "5+0", "10+0", "10+5"];

/** Banda di rating: parte stretta, si allarga con l'attesa (poll lato client). */
function bandForElapsed(elapsedSec: number): number {
  return Math.min(1000, 150 + Math.floor(elapsedSec / 10) * 100);
}

export function QuickMatch({ currentUserId }: { currentUserId: string }) {
  const t = useTranslations("play");
  const router = useRouter();
  const { toast } = useToast();
  const [searchingTc, setSearchingTc] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(0);
  const navigatedRef = useRef(false);

  const goToGame = useCallback(
    (id: string) => {
      if (navigatedRef.current) return;
      navigatedRef.current = true;
      router.push(`/app/gioca/${id}`);
    },
    [router],
  );

  // Avvia/ferma la ricerca per un controllo di tempo.
  const start = (tcId: string) => {
    navigatedRef.current = false;
    startRef.current = Date.now();
    setElapsed(0);
    setSearchingTc(tcId);
  };

  // Ferma la ricerca: il cleanup dell'effetto si occupa di uscire dalla coda.
  const stop = useCallback(() => {
    setSearchingTc(null);
  }, []);

  // Ciclo di ricerca: enqueue immediato + poll con banda crescente + Realtime.
  useEffect(() => {
    if (!searchingTc) return;
    const supabase = createClient();
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const tryEnqueue = async () => {
      if (cancelled) return;
      const sec = Math.floor((Date.now() - startRef.current) / 1000);
      const res = await enqueueMatch({
        timeControlId: searchingTc,
        band: bandForElapsed(sec),
      });
      if (cancelled) return;
      if (!res.ok) {
        toast({ title: res.error, variant: "error" });
        setSearchingTc(null);
        return;
      }
      if (res.data.gameId) goToGame(res.data.gameId);
    };

    (async () => {
      // Realtime: il websocket deve avere il JWT per leggere la propria riga (RLS).
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session?.access_token) supabase.realtime.setAuth(session.access_token);

      channel = supabase
        .channel(`mm:${currentUserId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "matchmaking_queue",
            filter: `user_id=eq.${currentUserId}`,
          },
          (payload) => {
            const row = payload.new as MatchmakingRow;
            if (row.game_id) goToGame(row.game_id);
          },
        )
        .subscribe();

      await tryEnqueue();
    })();

    // Poll di sicurezza (banda crescente) se il Realtime cade.
    const poll = setInterval(tryEnqueue, 2500);
    const tick = setInterval(
      () => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)),
      1000,
    );

    return () => {
      cancelled = true;
      clearInterval(poll);
      clearInterval(tick);
      if (channel) supabase.removeChannel(channel);
      // Annulla la ricerca se ce ne andiamo senza essere stati accoppiati
      // (cancel = annulla utente, smontaggio pagina). Idempotente lato server.
      if (!navigatedRef.current) void cancelMatch();
    };
  }, [searchingTc, currentUserId, goToGame, toast]);

  if (searchingTc) {
    const tc = findTimeControl(searchingTc);
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-text-muted" />
          <div>
            <p className="text-sm font-medium">{t("quickMatch.searching")}</p>
            <p className="mt-1 font-mono text-xs text-text-muted">
              {tc.label} · {elapsed}s
            </p>
          </div>
          <Button variant="secondary" onClick={stop} className="gap-1.5">
            <X className="h-4 w-4" /> {t("quickMatch.cancel")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Raggruppa i preset disponibili mantenendo l'ordine dei gruppi di TIME_CONTROLS.
  const presets = TIME_CONTROLS.filter((tc) => PRESET_IDS.includes(tc.id));
  const groups = Array.from(new Set(presets.map((p) => p.group)));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-4 w-4" /> {t("quickMatch.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-text-muted">{t("quickMatch.desc")}</p>
        {groups.map((group) => (
          <div key={group}>
            <div className="mb-2 text-xs uppercase tracking-wide text-text-muted">
              {group}
            </div>
            <div className="flex flex-wrap gap-2">
              {presets
                .filter((p) => p.group === group)
                .map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => start(p.id)}
                    className="flex-1 rounded-md border border-border px-3 py-2 font-mono text-sm transition-colors hover:border-text hover:text-text"
                  >
                    {p.label}
                  </button>
                ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
