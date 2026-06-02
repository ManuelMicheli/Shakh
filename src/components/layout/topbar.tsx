import { Avatar } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LogoutButton } from "./logout-button";

export function Topbar({
  displayName,
  avatarUrl,
}: {
  displayName?: string | null;
  avatarUrl?: string | null;
}) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface px-6">
      <div className="text-sm text-text-muted">
        {displayName ? `Ciao, ${displayName}` : " "}
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <Avatar name={displayName} src={avatarUrl} size={32} />
        <LogoutButton />
      </div>
    </header>
  );
}
