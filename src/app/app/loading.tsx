/**
 * Skeleton di route condiviso per tutto /app.
 *
 * Next monta questo istantaneamente (Suspense) appena parte una navigazione,
 * mentre il Server Component della pagina recupera i dati. È la differenza fra
 * "schermo fermo per 1-2s" e feedback immediato: la shell resta, il contenuto
 * mostra un placeholder sobrio finché i dati arrivano.
 */
import { getTranslations } from "next-intl/server";

export default async function AppLoading() {
  const t = await getTranslations("dashboard");
  return (
    <div className="space-y-8" aria-busy="true" aria-live="polite">
      <span className="sr-only">{t("loading")}</span>

      {/* Testata */}
      <div className="space-y-3">
        <div className="h-8 w-64 max-w-[70%] animate-pulse rounded-md bg-surface-2" />
        <div className="h-4 w-80 max-w-[85%] animate-pulse rounded-md bg-surface-2" />
      </div>

      {/* Griglia di card */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="space-y-3 rounded-xl border border-border bg-surface p-5"
          >
            <div className="h-4 w-1/2 animate-pulse rounded bg-surface-2" />
            <div className="h-3 w-full animate-pulse rounded bg-surface-2" />
            <div className="h-3 w-4/5 animate-pulse rounded bg-surface-2" />
          </div>
        ))}
      </div>
    </div>
  );
}
