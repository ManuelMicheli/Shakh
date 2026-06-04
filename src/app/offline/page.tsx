import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Offline",
  robots: { index: false, follow: false },
};

/**
 * Fallback servito dal service worker quando una navigazione fallisce per
 * mancanza di rete. Statica, nessuna dipendenza da dati o sessione.
 */
export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display text-2xl text-text">You&apos;re offline</h1>
      <p className="mt-3 text-text-muted">
        Shakh needs a connection for the AI coach, game imports, and engine
        analysis. Check your connection and try again.
      </p>
      <p className="mt-6 text-sm text-text-muted">
        Pages you&apos;ve already visited may remain available even without a
        connection.
      </p>
    </main>
  );
}
