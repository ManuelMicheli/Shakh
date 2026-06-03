"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";

/**
 * Smooth scroll Lenis sulla sola superficie pubblica. Rispetta
 * prefers-reduced-motion. NON deve girare sotto /app: lì la shell blocca lo
 * scroll della finestra (h-dvh overflow-hidden) e scrolla dentro <main>, quindi
 * Lenis (che pilota lo scroll della finestra) mangerebbe gli eventi wheel e lo
 * scroll risulterebbe morto.
 */
export function LenisProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isApp = pathname?.startsWith("/app");

  useEffect(() => {
    if (isApp) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    const lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, [isApp]);

  return <>{children}</>;
}
