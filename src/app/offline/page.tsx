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
      <h1 className="font-display text-2xl text-text">Sei offline</h1>
      <p className="mt-3 text-text-muted">
        Shakh ha bisogno della rete per il coach AI, l&apos;import delle partite
        e l&apos;analisi col motore. Ricontrolla la connessione e riprova.
      </p>
      <p className="mt-6 text-sm text-text-muted">
        Le pagine già visitate possono restare disponibili anche senza rete.
      </p>
    </main>
  );
}
