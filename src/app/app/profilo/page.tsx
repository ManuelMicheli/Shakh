import { redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CompetenceRadar, TrendLine } from "@/components/progress";
import { ProfileSettings } from "@/components/profile/ProfileSettings";
import { ExternalAccounts } from "@/components/profile/ExternalAccounts";
import { MobilePageHeader } from "@/components/layout/MobilePageHeader";
import type { LinkedAccount } from "@/app/app/profilo/actions";
import type { ExternalSource } from "@/lib/rating/calibration";
import { loadDashboard } from "@/lib/progress/aggregate";

export const metadata = { title: "Profilo — Shakh" };

export default async function ProfiloPage() {
  const supabase = await createClient();
  const user = await getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, username, locale, elo_estimate, current_level")
    .eq("id", user.id)
    .maybeSingle<{
      display_name: string | null;
      username: string | null;
      locale: string | null;
      elo_estimate: number | null;
      current_level: number;
    }>();

  const data = await loadDashboard(supabase, user.id);
  const radarAreas = data.competence.map((c) => ({ label: c.label, value: c.score }));

  const { data: extRows } = await supabase
    .from("external_accounts")
    .select("source, username, rating_native, rating_otb, n_games, verified, verify_token, fetched_at")
    .eq("user_id", user.id);
  const linkedAccounts: LinkedAccount[] = (
    (extRows as
      | {
          source: ExternalSource;
          username: string;
          rating_native: number | null;
          rating_otb: number | null;
          n_games: number;
          verified: boolean;
          verify_token: string | null;
          fetched_at: string;
        }[]
      | null) ?? []
  ).map((r) => ({
    source: r.source,
    username: r.username,
    ratingNative: r.rating_native,
    ratingOtb: r.rating_otb,
    nGames: r.n_games,
    verified: r.verified,
    verifyToken: r.verify_token,
    fetchedAt: r.fetched_at,
  }));

  return (
    <div className="space-y-6">
      <MobilePageHeader
        eyebrow="Il tuo profilo"
        title={profile?.display_name ?? profile?.username ?? "Profilo"}
        desc={`${user.email}${profile?.elo_estimate != null ? ` · Elo ${profile.elo_estimate}` : ""} · livello ${profile?.current_level ?? 0}`}
        piece="king"
      />
      <div className="hidden md:block">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          {profile?.display_name ?? profile?.username ?? "Profilo"}
        </h1>
        <p className="mt-2 text-text-muted">
          {user.email}
          {profile?.elo_estimate != null && ` · stima Elo ${profile.elo_estimate}`}
          {` · livello ${profile?.current_level ?? 0}`}
        </p>
      </div>

      <Tabs defaultValue="stats">
        <TabsList>
          <TabsTrigger value="stats">Statistiche</TabsTrigger>
          <TabsTrigger value="settings">Impostazioni</TabsTrigger>
        </TabsList>

        <TabsContent value="stats">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Competenze</CardTitle>
                <CardDescription>Dettaglio per area.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <CompetenceRadar areas={radarAreas} />
                <div className="divide-y divide-border">
                  {data.competence.map((c) => (
                    <div key={c.area} className="flex items-center justify-between py-2 text-sm">
                      <span>{c.label}</span>
                      <span className="font-mono text-text-muted">
                        {c.score == null ? "— nessun dato" : `${Math.round(c.score * 100)}% · ${c.attempts} prove`}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Storico rating tattico</CardTitle>
              </CardHeader>
              <CardContent>
                <TrendLine points={data.trends.rating} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Accuratezza nelle partite</CardTitle>
              </CardHeader>
              <CardContent>
                <TrendLine points={data.trends.accuracy} suffix="%" />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <div className="space-y-6">
            <ExternalAccounts initial={linkedAccounts} />
            <ProfileSettings
              initial={{
                displayName: profile?.display_name ?? "",
                username: profile?.username ?? "",
                locale: profile?.locale ?? "it",
              }}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
