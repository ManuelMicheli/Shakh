import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { OnlineGame } from "@/components/play/OnlineGame";
import { Button } from "@/components/ui/button";
import type { FriendGameRow } from "@/lib/play/types";

export const metadata = { title: "Partita — Shakh" };

export default async function GiocaIdPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("friend_games")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  const game = data as FriendGameRow | null;

  if (!game) {
    return (
      <div className="mx-auto max-w-md space-y-4 py-16 text-center">
        <h1 className="font-display text-2xl font-semibold">
          Partita non trovata
        </h1>
        <p className="text-text-muted">
          La partita non esiste, è già al completo, oppure non hai accesso.
        </p>
        <Link href="/app/gioca">
          <Button variant="secondary">Torna alle partite</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Partita con un amico
        </h1>
        <Link href="/app/gioca">
          <Button variant="ghost" size="sm">
            ← Tutte le partite
          </Button>
        </Link>
      </div>
      <OnlineGame initialGame={game} currentUserId={user!.id} />
    </div>
  );
}
