"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "./sidebar";
import { MobileNav } from "./mobile-nav";
import { Topbar } from "./topbar";
import { AnalysisJobProvider } from "@/components/analysis/AnalysisJobContext";
import { AnalysisMiniTab } from "@/components/analysis/AnalysisMiniTab";

const COLLAPSE_KEY = "shakh:sidebar-collapsed";

/**
 * Shell autenticata, con chrome divergente per piattaforma:
 * - desktop: sidebar rail riducibile a sinistra (`Sidebar`, md+);
 * - mobile: drawer a scomparsa con struttura propria (`MobileNav`).
 * Il contenuto (`children`) è montato una sola volta e condiviso fra i due.
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
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Ripristina la preferenza di riduzione (solo desktop).
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      // localStorage non disponibile: usa il default.
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        // ignora
      }
      return next;
    });
  }

  return (
    <AnalysisJobProvider>
      <div className="flex h-dvh overflow-hidden">
        <Sidebar collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
        <MobileNav open={mobileOpen} onClose={() => setMobileOpen(false)} />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Topbar
            displayName={displayName}
            avatarUrl={avatarUrl}
            onOpenMobile={() => setMobileOpen(true)}
          />
          {/* overflow-x-clip: nessun contenuto può far scorrere/zoomare la pagina
              in orizzontale (es. striscia mosse che cresce su mobile). La scroll
              verticale resta; gli scroller interni (tabelle, striscia) funzionano. */}
          <main className="flex-1 overflow-x-clip overflow-y-auto p-4 sm:p-6">
            <div className="mx-auto w-full max-w-[1800px]">{children}</div>
          </main>
        </div>
      </div>
      <AnalysisMiniTab />
    </AnalysisJobProvider>
  );
}
