"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Swords, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import {
  enrollChampionship,
  enqueueChampionship,
  cancelChampionship,
} from "@/app/app/campionato/actions";

interface Props {
  currentUserId: string;
  /** 'open' = finestra iscrizioni (gironi non ancora formati); 'active' = gioco. */
  seasonStatus: "open" | "active" | "closed";
  /** Iscritto al Campionato della stagione corrente? */
  enrolled: boolean;
  /** Partite ancora da giocare nel girone (per disabilitare quando finito). */
  remaining: number;
}

/**
 * Coda dedicata del Campionato. Se non iscritto: bottone "Iscriviti". Se
 * iscritto: "Gioca la prossima partita" → entra in coda, si accoppia con un
 * compagno di girone non ancora affrontato, naviga alla partita. Realtime +
 * poll come il matchmaking.
 */
export function ChampionshipQueue({
  currentUserId,
  seasonStatus,
  enrolled,
  remaining,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [searching, setSearching] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [busy, setBusy] = useState(false);
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

  const enroll = async () => {
    setBusy(true);
    const res = await enrollChampionship();
    setBusy(false);
    if (!res.ok) {
      toast({ title: res.error, variant: "error" });
      return;
    }
    toast({ title: "Iscrizione confermata", variant: "success" });
    router.refresh();
  };

  const startSearch = () => {
    navigatedRef.current = false;
    startRef.current = Date.now();
    setElapsed(0);
    setSearching(true);
  };

  const stop = useCallback(() => setSearching(false), []);

  useEffect(() => {
    if (!searching) return;
    const supabase = createClient();
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const tryEnqueue = async () => {
      if (cancelled) return;
      const res = await enqueueChampionship();
      if (cancelled) return;
      if (!res.ok) {
        toast({ title: res.error, variant: "error" });
        setSearching(false);
        return;
      }
      if (res.data.gameId) goToGame(res.data.gameId);
    };

    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session?.access_token) supabase.realtime.setAuth(session.access_token);

      channel = supabase
        .channel(`champ:${currentUserId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "championship_queue",
            filter: `user_id=eq.${currentUserId}`,
          },
          (payload) => {
            const row = payload.new as { game_id: string | null };
            if (row.game_id) goToGame(row.game_id);
          },
        )
        .subscribe();

      await tryEnqueue();
    })();

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
      if (!navigatedRef.current) void cancelChampionship();
    };
  }, [searching, currentUserId, goToGame, toast]);

  if (searching) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-text-muted" />
          <div>
            <p className="text-sm font-medium">In cerca di un avversario di girone…</p>
            <p className="mt-1 font-mono text-xs text-text-muted">{elapsed}s</p>
          </div>
          <Button variant="secondary" onClick={stop} className="gap-1.5">
            <X className="h-4 w-4" /> Annulla
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!enrolled) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
          <p className="text-sm text-text-muted">
            {seasonStatus === "open"
              ? "Iscrizioni aperte. All'avvio della stagione verrai distribuito in un girone da 8 bilanciato per rating: una partita contro ciascun avversario."
              : "Iscriviti al Campionato della tua divisione: verrai assegnato a un girone. Giocherai una volta contro ciascun avversario."}
          </p>
          <Button onClick={enroll} disabled={busy} className="gap-1.5">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Swords className="h-4 w-4" />}
            Iscriviti al Campionato
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Iscritto, ma gironi non ancora formati (finestra iscrizioni).
  if (seasonStatus === "open") {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-text-muted">
          Iscrizione confermata. I gironi vengono formati — bilanciati per rating
          — all&apos;avvio della stagione. Il gioco parte da lì.
        </CardContent>
      </Card>
    );
  }

  if (remaining <= 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-text-muted">
          Hai completato tutte le partite del girone. Aspetta la chiusura della
          stagione per la classifica finale.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
        <p className="text-sm text-text-muted">
          {remaining} {remaining === 1 ? "partita" : "partite"} da giocare nel
          girone.
        </p>
        <Button onClick={startSearch} className="gap-1.5">
          <Swords className="h-4 w-4" /> Gioca la prossima partita
        </Button>
      </CardContent>
    </Card>
  );
}
