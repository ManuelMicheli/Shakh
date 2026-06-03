"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { X } from "lucide-react";
import {
  navGroups,
  navFooter,
  navMobileQuick,
  isNavActive,
  type NavItem,
} from "./nav";
import { Badge } from "@/components/ui/badge";
import { BRAND_NAME } from "@/config/brand";
import { cn } from "@/lib/utils";

/**
 * Navigazione MOBILE (drawer a scomparsa). Struttura propria, divergente dalla
 * sidebar desktop: in cima riquadri di accesso rapido alle destinazioni piu
 * usate da telefono, sotto il menu completo a gruppi. Target tattili ampi.
 */
function MobileRow({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate: () => void;
}) {
  const Icon = item.icon;

  if (item.comingSoon) {
    return (
      <span
        aria-disabled="true"
        className="flex cursor-not-allowed items-center justify-between rounded-lg px-3 py-3 text-base text-text-muted opacity-60"
      >
        <span className="flex items-center gap-3">
          <Icon className="h-5 w-5 shrink-0" aria-hidden />
          {item.label}
        </span>
        <Badge variant="muted">presto</Badge>
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-3 text-base transition-colors",
        active
          ? "bg-surface-2 font-medium text-text"
          : "text-text-muted hover:bg-surface-2 hover:text-text",
      )}
    >
      <Icon className="h-5 w-5 shrink-0" aria-hidden />
      {item.label}
    </Link>
  );
}

export function MobileNav({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();

  // Blocca lo scroll del body mentre il drawer è aperto.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <div className="md:hidden">
      {/* Overlay. */}
      <div
        aria-hidden
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-40 bg-black/50 transition-opacity",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Menu di navigazione"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[85%] max-w-sm flex-col border-r border-border bg-surface transition-transform duration-200",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-14 shrink-0 items-center px-5">
          <Link
            href="/app"
            onClick={onClose}
            className="font-display text-xl font-semibold tracking-tight"
            aria-label={BRAND_NAME}
          >
            {BRAND_NAME}
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Chiudi menu"
            className="ml-auto rounded-md p-1.5 text-text-muted hover:bg-surface-2 hover:text-text"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-4">
          {/* Accesso rapido: riquadri 2×2. */}
          <p className="px-1 pb-2 pt-1 text-[0.7rem] font-medium uppercase tracking-wider text-text-muted/70">
            Accesso rapido
          </p>
          <div className="grid grid-cols-2 gap-2">
            {navMobileQuick.map((item) => {
              const Icon = item.icon;
              const active = isNavActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex flex-col items-start gap-2 rounded-xl border border-border p-3 transition-colors",
                    active
                      ? "bg-surface-2 text-text"
                      : "text-text-muted hover:bg-surface-2 hover:text-text",
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Menu completo a gruppi. */}
          <nav className="mt-4 space-y-4" aria-label="Navigazione completa">
            {navGroups.map((group, gi) => (
              <div key={group.label ?? `group-${gi}`} className="space-y-1">
                {group.label && (
                  <p className="px-3 pb-1 pt-1 text-[0.7rem] font-medium uppercase tracking-wider text-text-muted/70">
                    {group.label}
                  </p>
                )}
                {group.items.map((item) => (
                  <MobileRow
                    key={item.href}
                    item={item}
                    active={isNavActive(pathname, item.href)}
                    onNavigate={onClose}
                  />
                ))}
              </div>
            ))}
          </nav>
        </div>

        {/* Footer: gestione e account. */}
        <div className="space-y-1 border-t border-border px-3 py-2">
          {navFooter.map((item) => (
            <MobileRow
              key={item.href}
              item={item}
              active={isNavActive(pathname, item.href)}
              onNavigate={onClose}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
