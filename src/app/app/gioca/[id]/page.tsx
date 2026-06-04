import Link from "next/link";
import { createClient, getUser } from "@/lib/supabase/server";
import { OnlineGame } from "@/components/play/OnlineGame";
import { Button } from "@/components/ui/button";
import type { FriendGameRow } from "@/lib/play/types";

export const metadata = { title: "Game — Shakh" };

export default async function GiocaIdPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await getUser();

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
          Game not found
        </h1>
        <p className="text-text-muted">
          The game doesn&apos;t exist, is already full, or you don&apos;t have access.
        </p>
        <Link href="/app/gioca">
          <Button variant="secondary">Back to games</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Game with a friend
        </h1>
        <Link href="/app/gioca">
          <Button variant="ghost" size="sm">
            ← All games
          </Button>
        </Link>
      </div>
      <OnlineGame initialGame={game} currentUserId={user!.id} />
    </div>
  );
}
