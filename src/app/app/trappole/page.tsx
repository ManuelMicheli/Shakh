import Link from "next/link";
import { createClient, getUser } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { TrapCatalog } from "@/components/traps/TrapCatalog";
import { MobilePageHeader } from "@/components/layout/MobilePageHeader";
import { listTraps, countDueTraps } from "@/lib/traps/query";

export const metadata = {
  title: "Trappole · Shakh",
};

export default async function TrappolePage() {
  const supabase = await createClient();
  const user = await getUser();

  const [traps, dueCount] = await Promise.all([
    listTraps(supabase),
    user ? countDueTraps(supabase, user.id) : Promise.resolve(0),
  ]);

  return (
    <div className="space-y-8">
      <MobilePageHeader
        eyebrow="L'esca e lo scatto"
        title="Trappole"
        desc="Tendi la trappola o impara a non caderci."
        glyph="♞"
      />
      {dueCount > 0 && (
        <Link
          href="/app/trappole/ripasso"
          className="flex items-center justify-center gap-2 rounded-xl border border-text bg-text px-4 py-3 text-sm font-medium text-bg md:hidden"
        >
          Ripassa <Badge variant="muted">{dueCount} in scadenza</Badge>
        </Link>
      )}
      <div className="hidden flex-wrap items-end justify-between gap-3 md:flex">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Trappole</h1>
          <p className="mt-2 max-w-2xl text-text-muted">
            Dalle classiche alle chicche di nicchia: l&apos;esca, lo scatto e il perché
            vince. Tendi la trappola o impara a non caderci.
          </p>
        </div>
        {dueCount > 0 && (
          <Link
            href="/app/trappole/ripasso"
            className="inline-flex items-center gap-2 rounded-md border border-text bg-text px-4 py-2 text-sm font-medium text-bg transition-opacity hover:opacity-90"
          >
            Ripassa <Badge variant="muted">{dueCount} in scadenza</Badge>
          </Link>
        )}
      </div>

      {traps.length === 0 ? (
        <p className="text-text-muted">
          Nessuna trappola pubblicata. Applica il seed (migration{" "}
          <span className="font-mono">0008_traps_seed.sql</span>) per popolarne il catalogo.
        </p>
      ) : (
        <TrapCatalog traps={traps} />
      )}
    </div>
  );
}
