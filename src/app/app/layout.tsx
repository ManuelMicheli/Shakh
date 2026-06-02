import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/app-shell";

// Le rotte sotto /app sono private: mai indicizzate (§4).
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Il middleware già protegge /app, ma teniamo il guard per sicurezza.
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, username")
    .eq("id", user.id)
    .maybeSingle();

  const displayName =
    profile?.display_name ??
    profile?.username ??
    (user.email ? user.email.split("@")[0] : null);

  return (
    <AppShell displayName={displayName} avatarUrl={null}>
      {children}
    </AppShell>
  );
}
