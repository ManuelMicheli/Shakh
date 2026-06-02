import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

/**
 * Shell autenticata: sidebar a sinistra, topbar in alto, contenuto al centro.
 */
export function AppShell({
  displayName,
  avatarUrl,
  children,
}: {
  displayName?: string | null;
  avatarUrl?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar displayName={displayName} avatarUrl={avatarUrl} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
