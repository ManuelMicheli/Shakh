"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { AnalysisJobProvider } from "@/components/analysis/AnalysisJobContext";
import { AnalysisMiniTab } from "@/components/analysis/AnalysisMiniTab";

const COLLAPSE_KEY = "shakh:sidebar-collapsed";

/**
 * Shell autenticata: sidebar a sinistra, topbar in alto, contenuto al centro.
 * Su desktop la sidebar è riducibile (rail con sole icone); su mobile diventa
 * un drawer a scomparsa con overlay, aperto dal pulsante nella topbar.
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
        <Sidebar
          collapsed={collapsed}
          mobileOpen={mobileOpen}
          onToggleCollapsed={toggleCollapsed}
          onCloseMobile={() => setMobileOpen(false)}
        />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Topbar
            displayName={displayName}
            avatarUrl={avatarUrl}
            onOpenMobile={() => setMobileOpen(true)}
          />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="mx-auto w-full max-w-[1536px]">{children}</div>
          </main>
        </div>
      </div>
      <AnalysisMiniTab />
    </AnalysisJobProvider>
  );
}
