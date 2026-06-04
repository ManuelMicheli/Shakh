import { createClient, getUser } from "@/lib/supabase/server";
import { PlayHub } from "@/components/play/PlayHub";
import { MobilePageHeader } from "@/components/layout/MobilePageHeader";
import type { FriendGameRow } from "@/lib/play/types";

export const metadata = { title: "Gioca con un amico — Shakh" };

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
        eyebrow="Con un amico"
        title="Gioca"
        desc="Stesso dispositivo o online in differita con un link condivisibile."
      />
      <div className="hidden md:block">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Gioca con un amico
        </h1>
        <p className="mt-2 text-text-muted">
          Sfida un amico sullo stesso dispositivo, oppure online in differita con
          un link condivisibile. Scegli il tempo, rivedi le mosse, torna indietro.
        </p>
      </div>

      <PlayHub
        myGames={(games as FriendGameRow[] | null) ?? []}
        currentUserId={user!.id}
      />
    </div>
  );
}
