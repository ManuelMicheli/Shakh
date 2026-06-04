import { Menu } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LocaleToggle } from "./locale-toggle";
import { LogoutButton } from "./logout-button";
import { BackButton } from "./back-button";

export function Topbar({
  displayName,
  avatarUrl,
  onOpenMobile,
}: {
  displayName?: string | null;
  avatarUrl?: string | null;
  onOpenMobile?: () => void;
}) {
  return (
    // pt = safe-area-inset-top: in PWA standalone (status bar translucent) la
    // barra resterebbe sotto la status bar/notch e l'hamburger irraggiungibile.
    <header
      className="flex shrink-0 flex-col border-b border-border bg-surface"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="flex h-14 items-center justify-between px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={onOpenMobile}
            aria-label="Open menu"
            className="-ml-1 rounded-md p-1.5 text-text-muted hover:bg-surface-2 hover:text-text md:hidden"
          >
            <Menu className="h-5 w-5" aria-hidden />
          </button>
          <BackButton />
          <div className="truncate text-sm text-text-muted">
            {displayName ? `Hi, ${displayName}` : " "}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <LocaleToggle />
          <ThemeToggle />
          <Avatar name={displayName} src={avatarUrl} size={32} />
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
