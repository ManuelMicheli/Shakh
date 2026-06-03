"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { navGroups, navFooter, isNavActive, type NavItem } from "./nav";
import { Badge } from "@/components/ui/badge";
import { BRAND_NAME } from "@/config/brand";
import { cn } from "@/lib/utils";

/**
 * Sidebar SOLO desktop (rail riducibile a sole icone). La navigazione mobile
 * vive in `MobileNav` (drawer con struttura propria) — i due chrome sono
 * volutamente divergenti.
 */
function NavRow({
  item,
  active,
  collapsed,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
}) {
  const Icon = item.icon;

  if (item.comingSoon) {
    return (
      <span
        aria-disabled="true"
        title={collapsed ? item.label : undefined}
        className={cn(
          "flex cursor-not-allowed items-center justify-between rounded-md px-3 py-2 text-sm text-text-muted opacity-60",
          collapsed && "justify-center px-2",
        )}
      >
        <span className="flex items-center gap-3">
          <Icon className="h-4 w-4 shrink-0" aria-hidden />
          <span className={cn(collapsed && "hidden")}>{item.label}</span>
        </span>
        <Badge variant="muted" className={cn(collapsed && "hidden")}>
          presto
        </Badge>
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      title={collapsed ? item.label : undefined}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
        collapsed && "justify-center px-2",
        active
          ? "bg-surface-2 font-medium text-text"
          : "text-text-muted hover:bg-surface-2 hover:text-text",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      <span className={cn(collapsed && "hidden")}>{item.label}</span>
    </Link>
  );
}

export function Sidebar({
  collapsed,
  onToggleCollapsed,
}: {
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        // Solo desktop: statica nel flusso. Su mobile non esiste (drawer altrove).
        "hidden h-full shrink-0 flex-col border-r border-border bg-surface transition-all duration-200 md:flex",
        collapsed ? "w-16" : "w-60",
      )}
    >
      <div
        className={cn(
          "flex h-14 items-center",
          collapsed ? "justify-center px-0" : "px-5",
        )}
      >
        <Link
          href="/app"
          className="font-display text-xl font-semibold tracking-tight"
          aria-label={BRAND_NAME}
        >
          {collapsed ? BRAND_NAME.charAt(0) : BRAND_NAME}
        </Link>
      </div>

      <nav
        className="flex-1 space-y-4 overflow-y-auto px-3 py-2"
        aria-label="Navigazione principale"
      >
        {navGroups.map((group, gi) => (
          <div key={group.label ?? `group-${gi}`} className="space-y-1">
            {group.label &&
              (collapsed ? (
                <div aria-hidden className="mx-2 border-t border-border" />
              ) : (
                <p className="px-3 pb-1 pt-1 text-[0.7rem] font-medium uppercase tracking-wider text-text-muted/70">
                  {group.label}
                </p>
              ))}
            {group.items.map((item) => (
              <NavRow
                key={item.href}
                item={item}
                active={isNavActive(pathname, item.href)}
                collapsed={collapsed}
              />
            ))}
          </div>
        ))}
      </nav>

      {/* Footer: gestione e account, separati dal flusso del percorso. */}
      <div className="space-y-1 border-t border-border px-3 py-2">
        {navFooter.map((item) => (
          <NavRow
            key={item.href}
            item={item}
            active={isNavActive(pathname, item.href)}
            collapsed={collapsed}
          />
        ))}
      </div>

      {/* Riduci/espandi. */}
      <div className="border-t border-border p-3">
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? "Espandi barra laterale" : "Riduci barra laterale"}
          title={collapsed ? "Espandi" : "Riduci"}
          className={cn(
            "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-text-muted transition-colors hover:bg-surface-2 hover:text-text",
            collapsed && "justify-center px-2",
          )}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4 shrink-0" aria-hidden />
          ) : (
            <PanelLeftClose className="h-4 w-4 shrink-0" aria-hidden />
          )}
          <span className={cn(collapsed && "hidden")}>Riduci</span>
        </button>
      </div>
    </aside>
  );
}
