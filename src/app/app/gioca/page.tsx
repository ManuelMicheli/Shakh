import { createClient, getUser } from "@/lib/supabase/server";
import { PlayHub } from "@/components/play/PlayHub";
import { MobilePageHeader } from "@/components/layout/MobilePageHeader";
import type { FriendGameRow } from "@/lib/play/types";

export const metadata = { title: "Play a friend — Shakh" };

export default async function GiocaPage() {
  const supabase = await createClient();
  const user = await getUser();

  const { data: games } = await supabase
    .from("friend_games")
    .select("*")
    .or(`white_user_id.eq.${user!.id},black_user_id.eq.${user!.id}`)
    .order("updated_at", { ascending: false })
    .limit(30);

  return (
    <div className="space-y-8">
      <MobilePageHeader
        eyebrow="With a friend"
        title="Play"
        desc="Same device or asynchronous online with a shareable link."
      />
      <div className="hidden md:block">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Play a friend
        </h1>
        <p className="mt-2 text-text-muted">
          Challenge a friend on the same device, or play asynchronously online with
          a shareable link. Pick the time control, review the moves, step back.
        </p>
      </div>

      <PlayHub
        myGames={(games as FriendGameRow[] | null) ?? []}
        currentUserId={user!.id}
      />
    </div>
  );
}
