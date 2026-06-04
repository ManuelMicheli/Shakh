import Link from "next/link";
import { getTranslations } from "next-intl/server";
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
  const t = await getTranslations("play");

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
          {t("notFound.title")}
        </h1>
        <p className="text-text-muted">
          {t("notFound.desc")}
        </p>
        <Link href="/app/gioca">
          <Button variant="secondary">{t("notFound.back")}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          {t("game.title")}
        </h1>
        <Link href="/app/gioca">
          <Button variant="ghost" size="sm">
            ← {t("game.allGames")}
          </Button>
        </Link>
      </div>
      <OnlineGame initialGame={game} currentUserId={user!.id} />
    </div>
  );
}
