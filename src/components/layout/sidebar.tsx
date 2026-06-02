"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems } from "./nav";
import { Badge } from "@/components/ui/badge";
import { BRAND_NAME } from "@/config/brand";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-border bg-surface">
      <div className="flex h-14 items-center px-5">
        <Link
          href="/app"
          className="font-display text-xl font-semibold tracking-tight"
        >
          {BRAND_NAME}
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2" aria-label="Navigazione principale">
        {navItems.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;

          if (item.comingSoon) {
            return (
              <span
                key={item.href}
                aria-disabled="true"
                className="flex cursor-not-allowed items-center justify-between rounded-md px-3 py-2 text-sm text-text-muted opacity-60"
              >
                <span className="flex items-center gap-3">
                  <Icon className="h-4 w-4" aria-hidden />
                  {item.label}
                </span>
                <Badge variant="muted">presto</Badge>
              </span>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-surface-2 font-medium text-text"
                  : "text-text-muted hover:bg-surface-2 hover:text-text",
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
