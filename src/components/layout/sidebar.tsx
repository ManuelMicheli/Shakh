"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { PanelLeftClose, PanelLeftOpen, ChevronDown } from "lucide-react";
import {
  navGroups,
  navFooter,
  isNavActive,
  type NavItem,
  type NavGroup,
} from "./nav";
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

/**
 * Sezione maggiore collassabile (Studia / Allenati / Gioca e analizza):
 * intestazione in evidenza che, premuta, rivela le sottovoci. Si apre
 * automaticamente se contiene la voce attiva.
 */
function CollapsibleGroup({
  group,
  pathname,
}: {
  group: NavGroup;
  pathname: string;
}) {
  const hasActive = group.items.some((item) =>
    isNavActive(pathname, item.href),
  );
  const [open, setOpen] = useState(hasActive);

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(
          "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-semibold tracking-tight transition-colors",
          "text-text hover:bg-surface-2",
        )}
      >
        <span>{group.label}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-text-muted transition-transform duration-200",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      {open && (
        <div className="space-y-1 pl-2">
          {group.items.map((item) => (
            <NavRow
              key={item.href}
              item={item}
              active={isNavActive(pathname, item.href)}
              collapsed={false}
            />
          ))}
        </div>
      )}
    </div>
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
        {navGroups.map((group, gi) => {
          // Rail ridotto: niente accordion, voci piatte come icone (divider tra gruppi).
          if (collapsed) {
            return (
              <div key={group.label ?? `group-${gi}`} className="space-y-1">
                {group.label && (
                  <div aria-hidden className="mx-2 border-t border-border" />
                )}
                {group.items.map((item) => (
                  <NavRow
                    key={item.href}
                    item={item}
                    active={isNavActive(pathname, item.href)}
                    collapsed
                  />
                ))}
              </div>
            );
          }

          // Ancore senza etichetta: sempre piatte e visibili.
          if (!group.label) {
            return (
              <div key={`group-${gi}`} className="space-y-1">
                {group.items.map((item) => (
                  <NavRow
                    key={item.href}
                    item={item}
                    active={isNavActive(pathname, item.href)}
                    collapsed={false}
                  />
                ))}
              </div>
            );
          }

          // Sezioni maggiori: in evidenza e collassabili.
          return (
            <CollapsibleGroup key={group.label} group={group} pathname={pathname} />
          );
        })}
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
