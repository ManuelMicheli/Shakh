"use client";

import { useRouter, usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";

/**
 * Pulsante "Indietro" globale nella topbar: presente su ogni pagina sotto /app
 * tranne la dashboard radice (/app), che è già il punto di partenza.
 *
 * Torna alla pagina precedente nella cronologia (router.back()), il
 * comportamento atteso da "torna indietro". Se non c'è cronologia in-app
 * (es. ingresso da URL diretto), ripiega sulla dashboard.
 */
export function BackButton() {
  const router = useRouter();
  const pathname = usePathname();

  // Niente pulsante sulla dashboard: è la radice della shell autenticata.
  if (pathname === "/app") return null;

  function goBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/app");
    }
  }

  return (
    <button
      type="button"
      onClick={goBack}
      aria-label="Go back"
      className="-ml-1 flex items-center gap-1.5 rounded-md p-1.5 text-sm text-text-muted hover:bg-surface-2 hover:text-text"
    >
      <ArrowLeft className="h-5 w-5" aria-hidden />
      <span className="hidden sm:inline">Back</span>
    </button>
  );
}
