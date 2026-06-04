import Link from "next/link";
import { createClient, getUser } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { TrapCatalog } from "@/components/traps/TrapCatalog";
import { MobilePageHeader } from "@/components/layout/MobilePageHeader";
import { listTraps, countDueTraps } from "@/lib/traps/query";

export const metadata = {
  title: "Traps · Shakh",
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
        eyebrow="The lure and the spring"
        title="Traps"
        desc="Set the trap or learn not to fall for it."
      />
      {dueCount > 0 && (
        <Link
          href="/app/trappole/ripasso"
          className="flex items-center justify-center gap-2 rounded-xl border border-text bg-text px-4 py-3 text-sm font-medium text-bg md:hidden"
        >
          Review <Badge variant="muted">{dueCount} due</Badge>
        </Link>
      )}
      <div className="hidden flex-wrap items-end justify-between gap-3 md:flex">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Traps</h1>
          <p className="mt-2 max-w-2xl text-text-muted">
            From the classics to niche gems: the lure, the spring and why it
            wins. Set the trap or learn not to fall for it.
          </p>
        </div>
        {dueCount > 0 && (
          <Link
            href="/app/trappole/ripasso"
            className="inline-flex items-center gap-2 rounded-md border border-text bg-text px-4 py-2 text-sm font-medium text-bg transition-opacity hover:opacity-90"
          >
            Review <Badge variant="muted">{dueCount} due</Badge>
          </Link>
        )}
      </div>

      {traps.length === 0 ? (
        <p className="text-text-muted">
          No published traps. Apply the seed (migration{" "}
          <span className="font-mono">0008_traps_seed.sql</span>) to populate the catalog.
        </p>
      ) : (
        <TrapCatalog traps={traps} />
      )}
    </div>
  );
}
