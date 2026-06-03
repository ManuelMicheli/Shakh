"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { navGroups, navFooter, type NavItem } from "./nav";
import { Badge } from "@/components/ui/badge";
import { BRAND_NAME } from "@/config/brand";
import { cn } from "@/lib/utils";

/** Attiva la voce su match esatto per la dashboard, per prefisso altrove. */
function isActive(pathname: string, href: string): boolean {
  if (href === "/app") return pathname === "/app";
  return pathname === href || pathname.startsWith(href + "/");
}

function NavRow({
  item,
  active,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  onNavigate: () => void;
}) {
  const Icon = item.icon;

  if (item.comingSoon) {
    return (
      <span
        aria-disabled="true"
        title={collapsed ? item.label : undefined}
        className={cn(
          "flex cursor-not-allowed items-center justify-between rounded-md px-3 py-2 text-sm text-text-muted opacity-60",
          collapsed && "md:justify-center md:px-2",
        )}
      >
        <span className="flex items-center gap-3">
          <Icon className="h-4 w-4 shrink-0" aria-hidden />
          <span className={cn(collapsed && "md:hidden")}>{item.label}</span>
        </span>
        <Badge variant="muted" className={cn(collapsed && "md:hidden")}>
          presto
        </Badge>
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      title={collapsed ? item.label : undefined}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
        collapsed && "md:justify-center md:px-2",
        active
          ? "bg-surface-2 font-medium text-text"
          : "text-text-muted hover:bg-surface-2 hover:text-text",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      <span className={cn(collapsed && "md:hidden")}>{item.label}</span>
    </Link>
  );
}

export function Sidebar({
  collapsed,
  mobileOpen,
  onToggleCollapsed,
  onCloseMobile,
}: {
  collapsed: boolean;
  mobileOpen: boolean;
  onToggleCollapsed: () => void;
  onCloseMobile: () => void;
}) {
  const pathname = usePathname();

  return (
    <>
      {/* Overlay del drawer (solo mobile). */}
      <div
        aria-hidden
        onClick={onCloseMobile}
        className={cn(
          "fixed inset-0 z-40 bg-black/50 transition-opacity md:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-full w-64 flex-col border-r border-border bg-surface transition-all duration-200",
          // Desktop: statica nel flusso, larghezza in base allo stato ridotto.
          "md:static md:z-auto md:translate-x-0",
          collapsed ? "md:w-16" : "md:w-60",
          // Mobile: drawer a scomparsa.
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div
          className={cn(
            "flex h-14 items-center",
            collapsed ? "md:justify-center md:px-0" : "px-5",
          )}
        >
          <Link
            href="/app"
            onClick={onCloseMobile}
            className="font-display text-xl font-semibold tracking-tight"
            aria-label={BRAND_NAME}
          >
            {collapsed ? (
              <>
                <span className="md:hidden">{BRAND_NAME}</span>
                <span className="hidden md:inline">{BRAND_NAME.charAt(0)}</span>
              </>
            ) : (
              BRAND_NAME
            )}
          </Link>

          {/* Chiusura drawer (solo mobile). */}
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Chiudi menu"
            className="ml-auto rounded-md p-1.5 text-text-muted hover:bg-surface-2 hover:text-text md:hidden"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <nav
          className="flex-1 space-y-4 overflow-y-auto px-3 py-2"
          aria-label="Navigazione principale"
        >
          {navGroups.map((group, gi) => (
            <div key={group.label ?? `group-${gi}`} className="space-y-1">
              {group.label &&
                (collapsed ? (
                  // Ridotta: niente etichetta, solo un separatore tra i gruppi.
                  <div
                    aria-hidden
                    className="mx-2 hidden border-t border-border md:block"
                  />
                ) : (
                  <p className="px-3 pb-1 pt-1 text-[0.7rem] font-medium uppercase tracking-wider text-text-muted/70">
                    {group.label}
                  </p>
                ))}
              {group.items.map((item) => (
                <NavRow
                  key={item.href}
                  item={item}
                  active={isActive(pathname, item.href)}
                  collapsed={collapsed}
                  onNavigate={onCloseMobile}
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
              active={isActive(pathname, item.href)}
              collapsed={collapsed}
              onNavigate={onCloseMobile}
            />
          ))}
        </div>

        {/* Riduci/espandi (solo desktop). */}
        <div className="hidden border-t border-border p-3 md:block">
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
    </>
  );
}
