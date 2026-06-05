import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient, getUser } from "@/lib/supabase/server";
import { loadOverallRating } from "@/lib/rating/store";
import { GLICKO_ANCHOR } from "@/lib/rating/glicko2";
import {
  DIVISIONS,
  divisionForRating,
  progressInDivision,
  pointsToPromotion,
} from "@/lib/lega/divisions";
import { MobilePageHeader } from "@/components/layout/MobilePageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export async function generateMetadata() {
  return { title: "La Lega" };
}

export default async function LegaPage() {
  const supabase = await createClient();
  const user = await getUser();
  await getTranslations("play"); // mantiene il bundle i18n caricato (copy futura)

  const overall = await loadOverallRating(supabase, user!.id);
  const rating = Math.round(overall?.rating ?? GLICKO_ANCHOR);
  const provisional = overall?.provisional ?? true;
  const me = divisionForRating(rating);
  const progress = progressInDivision(rating, me);
  const toPromo = pointsToPromotion(rating, me);

  // Dalla più alta alla più bassa (vetta in cima).
  const ladder = [...DIVISIONS].reverse();

  return (
    <div className="space-y-8">
      <MobilePageHeader
        eyebrow="Competizione"
        title="La Lega"
        desc="Il tuo rango, derivato dal Rating Shakh."
      />
      <div className="hidden md:block">
        <h1 className="font-display text-3xl font-semibold tracking-tight">La Lega</h1>
        <p className="mt-2 text-text-muted">
          Sei divisioni a tema. La tua divisione segue il Rating Shakh: sali di
          rating, sali di divisione. È anche la porta del Campionato.
        </p>
      </div>

      {/* Riepilogo divisione attuale */}
      <Card>
        <CardContent className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="text-5xl leading-none" aria-hidden>
              {me.glyph}
            </span>
            <div>
              <p className="text-xs uppercase tracking-wide text-text-muted">
                Divisione attuale
              </p>
              <p className="font-display text-2xl font-semibold">{me.name}</p>
              <p className="font-mono text-sm text-text-muted">
                Rating {rating}
                {provisional && <span className="ml-1.5 text-xs">(provvisorio)</span>}
              </p>
            </div>
          </div>
          <Link
            href="/app/campionato"
            className="inline-flex h-10 items-center justify-center rounded-md bg-text px-4 text-sm font-medium text-bg transition-opacity hover:opacity-90"
          >
            Vai al Campionato
          </Link>
        </CardContent>
      </Card>

      {/* Barra di progresso verso la promozione */}
      {toPromo != null && (
        <div>
          <div className="mb-1.5 flex justify-between text-xs text-text-muted">
            <span>Progresso in {me.name}</span>
            <span className="font-mono">{toPromo} punti alla promozione</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-text transition-all"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Scala delle divisioni */}
      <div className="space-y-2">
        {ladder.map((d) => {
          const isMe = d.key === me.key;
          return (
            <div
              key={d.key}
              className={cn(
                "flex items-center gap-4 rounded-lg border px-4 py-3 transition-colors",
                isMe ? "border-text bg-surface-2" : "border-border",
              )}
            >
              <span className="w-8 text-center text-2xl leading-none" aria-hidden>
                {d.glyph}
              </span>
              <div className="flex-1">
                <p className={cn("font-medium", isMe && "font-semibold")}>{d.name}</p>
                <p className="font-mono text-xs text-text-muted">
                  {isFiniteBand(d.max)
                    ? `${d.min}–${d.max}`
                    : `${d.min}+`}
                </p>
              </div>
              {isMe && (
                <span className="text-xs uppercase tracking-wide text-text-muted">
                  Tu
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function isFiniteBand(n: number): boolean {
  return Number.isFinite(n);
}
