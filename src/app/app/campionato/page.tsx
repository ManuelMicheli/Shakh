import Link from "next/link";
import { createClient, getUser } from "@/lib/supabase/server";
import { loadOverallRating } from "@/lib/rating/store";
import { GLICKO_ANCHOR } from "@/lib/rating/glicko2";
import { divisionForRating, divisionByKey } from "@/lib/lega/divisions";
import { findTimeControl } from "@/lib/play/time-controls";
import { MobilePageHeader } from "@/components/layout/MobilePageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChampionshipQueue } from "@/components/championship/ChampionshipQueue";
import { Standings } from "@/components/championship/Standings";
import type { SeasonRow, MemberRow, GroupRow } from "@/lib/championship/types";

export async function generateMetadata() {
  return { title: "Il Campionato" };
}

export default async function CampionatoPage() {
  const supabase = await createClient();
  const user = await getUser();

  const overall = await loadOverallRating(supabase, user!.id);
  const rating = Math.round(overall?.rating ?? GLICKO_ANCHOR);
  const myDivision = divisionForRating(rating);

  // Stagione corrente (attiva o aperta).
  const { data: seasonData } = await supabase
    .from("championship_seasons")
    .select("*")
    .in("status", ["open", "active"])
    .order("starts_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const season = seasonData as SeasonRow | null;

  // Iscrizione dell'utente nella stagione corrente.
  let membership: MemberRow | null = null;
  let group: GroupRow | null = null;
  let groupMembers: MemberRow[] = [];

  if (season) {
    const { data: memData } = await supabase
      .from("championship_members")
      .select("*")
      .eq("season_id", season.id)
      .eq("user_id", user!.id)
      .maybeSingle();
    membership = memData as MemberRow | null;

    if (membership) {
      const [{ data: grpData }, { data: gmData }] = await Promise.all([
        supabase
          .from("championship_groups")
          .select("*")
          .eq("id", membership.group_id)
          .maybeSingle(),
        supabase
          .from("championship_members")
          .select("*")
          .eq("group_id", membership.group_id),
      ]);
      group = grpData as GroupRow | null;
      groupMembers = (gmData as MemberRow[] | null) ?? [];
    }
  }

  const tc = season ? findTimeControl(season.time_control_id) : null;
  // Partite restanti: avversari del girone non ancora affrontati.
  const remaining = membership
    ? Math.max(0, groupMembers.length - 1 - membership.played)
    : 0;

  return (
    <div className="space-y-8">
      <MobilePageHeader
        eyebrow="Competizione"
        title="Il Campionato"
        desc="Round-robin di girone nella tua divisione."
      />
      <div className="hidden md:block">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Il Campionato
        </h1>
        <p className="mt-2 text-text-muted">
          Gironi da 8 nella tua divisione di{" "}
          <Link href="/app/lega" className="underline underline-offset-2">
            Lega
          </Link>
          . Una partita contro ciascun avversario, punteggio 1 / ½ / 0. A fine
          stagione: promozione del 1°, retrocessione dell&apos;ultimo.
        </p>
      </div>

      {!season ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-text-muted">
            Nessuna stagione attiva al momento. Torna presto.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Intestazione stagione */}
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-text-muted">
                Stagione · {season.label ?? season.code}
              </p>
              <p className="font-display text-xl font-semibold">
                {(membership && divisionByKey(membership.division)?.name) ??
                  myDivision.name}{" "}
                {(membership && divisionByKey(membership.division)?.glyph) ??
                  myDivision.glyph}
              </p>
            </div>
            {tc && (
              <p className="font-mono text-sm text-text-muted">
                Controllo {tc.label}
              </p>
            )}
          </div>

          <ChampionshipQueue
            currentUserId={user!.id}
            seasonStatus={season.status}
            enrolled={!!membership}
            remaining={remaining}
          />

          {membership && group && (
            <Card>
              <CardHeader>
                <CardTitle>{group.label ?? "Girone"}</CardTitle>
              </CardHeader>
              <CardContent>
                <Standings members={groupMembers} currentUserId={user!.id} />
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
