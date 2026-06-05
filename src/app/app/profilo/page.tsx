import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Check, Globe } from "lucide-react";
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
import { activeLocale } from "@/lib/i18n/content";

export async function generateMetadata() {
  const t = await getTranslations("profile");
  return { title: t("metaTitle") };
}

/** Etichette di marca delle piattaforme online (nomi propri, non traducibili). */
const SOURCE_LABEL: Record<ExternalSource, string> = {
  lichess: "Lichess",
  chesscom: "Chess.com",
};

export default async function ProfiloPage() {
  const t = await getTranslations("profile");
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

  const data = await loadDashboard(supabase, user.id, await activeLocale());
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

  const displayName = profile?.display_name ?? profile?.username ?? t("fallbackTitle");
  const localeLabel = (profile?.locale ?? "it") === "en" ? "English" : "Italiano";

  // Chip identità (desktop): livello, rating Shakh/Elo, lingua. Nessun "membro
  // dal": il dato non esiste nello schema, quindi viene omesso (no dati finti).
  const identityChips = [
    t("level", { level: profile?.current_level ?? 0 }),
    profile?.elo_estimate != null ? t("eloShort", { elo: profile.elo_estimate }) : null,
    localeLabel,
  ].filter((c): c is string => c != null);

  return (
    <div className="space-y-6">
      <MobilePageHeader
        eyebrow={t("eyebrow")}
        title={displayName}
        desc={`${user.email}${profile?.elo_estimate != null ? ` · ${t("eloShort", { elo: profile.elo_estimate })}` : ""} · ${t("level", { level: profile?.current_level ?? 0 })}`}
      />

      {/* Intestazione identità (desktop): avatar, nome, email, chip. */}
      <div className="hidden items-center gap-5 md:flex">
        <span className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-text font-display text-3xl font-semibold text-bg">
          {displayName.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-semibold tracking-tight">{displayName}</h1>
          <p className="mt-1 truncate text-sm text-text-muted">{user.email}</p>
          <div className="mt-3 flex flex-wrap gap-2 font-mono text-xs">
            {identityChips.map((chip) => (
              <span
                key={chip}
                className="rounded-full border border-border px-3 py-1 text-text-muted"
              >
                {chip}
              </span>
            ))}
          </div>
        </div>
      </div>

      <Tabs defaultValue="stats">
        <TabsList>
          <TabsTrigger value="stats">{t("tabStats")}</TabsTrigger>
          <TabsTrigger value="settings">{t("tabSettings")}</TabsTrigger>
        </TabsList>

        <TabsContent value="stats">
          {/* Mobile: card impilate (invariato). */}
          <div className="space-y-6 md:hidden">
            <Card>
              <CardHeader>
                <CardTitle>{t("competenceTitle")}</CardTitle>
                <CardDescription>{t("competenceDesc")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <CompetenceRadar areas={radarAreas} />
                <div className="divide-y divide-border">
                  {data.competence.map((c) => (
                    <div key={c.area} className="flex items-center justify-between py-2 text-sm">
                      <span>{c.label}</span>
                      <span className="font-mono text-text-muted">
                        {c.score == null
                          ? t("noData")
                          : t("competenceValue", { percent: Math.round(c.score * 100), attempts: c.attempts })}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("ratingHistoryTitle")}</CardTitle>
              </CardHeader>
              <CardContent>
                <TrendLine points={data.trends.rating} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("accuracyTitle")}</CardTitle>
              </CardHeader>
              <CardContent>
                <TrendLine points={data.trends.accuracy} suffix="%" />
              </CardContent>
            </Card>
          </div>

          {/* Desktop: tavola "Passport" — competenze a sinistra, andamenti a
              destra, riepilogo account collegati in fondo. */}
          <div className="hidden md:block">
            <div className="space-y-8">
              <div className="chess-rule h-1.5 w-full opacity-80" />

              <div className="grid grid-cols-[22rem_1fr] gap-8">
                {/* Competenze: radar reale + dettaglio per area. */}
                <div className="rounded-2xl border border-border bg-surface p-6">
                  <p className="text-xs uppercase tracking-wider text-text-muted">
                    {t("competenceTitle")}
                  </p>
                  <div className="mt-4 grid place-items-center">
                    <CompetenceRadar areas={radarAreas} />
                  </div>
                  <div className="mt-4 divide-y divide-border">
                    {data.competence.map((c) => (
                      <div
                        key={c.area}
                        className="flex items-center justify-between py-2 text-sm"
                      >
                        <span>{c.label}</span>
                        <span className="font-mono text-text-muted">
                          {c.score == null
                            ? t("noData")
                            : t("competenceValue", {
                                percent: Math.round(c.score * 100),
                                attempts: c.attempts,
                              })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Andamenti: rating e accuratezza (componenti reali). */}
                <div className="space-y-4">
                  <div className="rounded-2xl border border-border bg-surface p-6">
                    <p className="text-xs uppercase tracking-wider text-text-muted">
                      {t("ratingHistoryTitle")}
                    </p>
                    <div className="mt-4">
                      <TrendLine points={data.trends.rating} />
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border bg-surface p-6">
                    <p className="text-xs uppercase tracking-wider text-text-muted">
                      {t("accuracyTitle")}
                    </p>
                    <div className="mt-4">
                      <TrendLine points={data.trends.accuracy} suffix="%" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Riepilogo account collegati (sola lettura): la gestione vive
                  nella scheda Impostazioni. Mostrato solo se ce ne sono. */}
              {linkedAccounts.length > 0 && (
                <div>
                  <p className="mb-3 text-xs font-medium uppercase tracking-wider text-text-muted">
                    {t("linkedAccountsTitle")}
                  </p>
                  <div className="overflow-hidden rounded-xl border border-border">
                    <div className="divide-y divide-border">
                      {linkedAccounts.map((a) => {
                        const rating = a.ratingOtb ?? a.ratingNative;
                        return (
                          <div
                            key={a.source}
                            className="flex items-center justify-between gap-3 bg-surface px-4 py-3"
                          >
                            <div className="flex items-center gap-3">
                              <Globe className="h-4 w-4 text-text-muted" />
                              <div className="min-w-0">
                                <p className="text-sm font-medium">{SOURCE_LABEL[a.source]}</p>
                                <p className="truncate font-mono text-[11px] text-text-muted">
                                  @{a.username}
                                </p>
                              </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-3">
                              {rating != null && (
                                <span className="font-mono text-sm tabular-nums">{rating}</span>
                              )}
                              {a.verified ? (
                                <span className="inline-flex items-center gap-1 font-mono text-[11px] text-text-muted">
                                  <Check className="h-3.5 w-3.5" /> {t("badgeVerified")}
                                </span>
                              ) : (
                                <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-text-muted">
                                  {t("badgeToVerify")}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
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
