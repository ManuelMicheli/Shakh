import { createClient } from "@/lib/supabase/server";
import { ImportPanel } from "@/components/games/ImportPanel";
import { GamesTable } from "@/components/games/GamesTable";
import type { GameRow } from "@/lib/games/types";

export const metadata = { title: "Le mie partite — Shakh" };

export default async function PartitePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: games } = await supabase
    .from("games")
    .select("*")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Le mie partite
        </h1>
        <p className="mt-2 text-text-muted">
          Importa le tue partite, analizzale col motore e rivedile mossa per mossa.
        </p>
      </div>

      <ImportPanel />

      <GamesTable games={(games as GameRow[] | null) ?? []} />
    </div>
  );
}
