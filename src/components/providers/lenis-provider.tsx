"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import type Lenis from "lenis";

/**
 * Smooth scroll Lenis sulla sola superficie pubblica. Rispetta
 * prefers-reduced-motion. NON deve girare sotto /app: lì la shell blocca lo
 * scroll della finestra (h-dvh overflow-hidden) e scrolla dentro <main>, quindi
 * Lenis (che pilota lo scroll della finestra) mangerebbe gli eventi wheel e lo
 * scroll risulterebbe morto.
 *
 * Il modulo `lenis` è importato dinamicamente: il provider vive nel root
 * layout, ma il peso della libreria viene scaricato solo dove serve davvero
 * (superficie pubblica, senza reduced-motion) e non sotto /app.
 */
export function LenisProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isApp = pathname?.startsWith("/app");

  useEffect(() => {
    if (isApp) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    let lenis: Lenis | null = null;
    let raf = 0;
    let cancelled = false;

    void import("lenis").then(({ default: LenisCtor }) => {
      if (cancelled) return;
      lenis = new LenisCtor({ lerp: 0.1, smoothWheel: true });
      const loop = (time: number) => {
        lenis?.raf(time);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      lenis?.destroy();
      lenis = null;
    };
  }, [isApp]);

  return <>{children}</>;
}
