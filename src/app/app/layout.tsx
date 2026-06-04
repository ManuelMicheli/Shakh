import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/app-shell";
import { FirstRunLocale } from "@/components/layout/FirstRunLocale";

// Le rotte sotto /app sono private: mai indicizzate (§4).
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  // Il middleware già protegge /app, ma teniamo il guard per sicurezza.
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, username, locale_chosen")
    .eq("id", user.id)
    .maybeSingle<{
      display_name: string | null;
      username: string | null;
      locale_chosen: boolean | null;
    }>();

  const displayName =
    profile?.display_name ??
    profile?.username ??
    (user.email ? user.email.split("@")[0] : null);

  return (
    <AppShell displayName={displayName} avatarUrl={null}>
      {children}
      <FirstRunLocale localeChosen={profile?.locale_chosen ?? false} />
    </AppShell>
  );
}
