import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Gamepad2, Trophy, Lock, Check, ChevronRight } from "lucide-react";
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

  // Dalla più alta alla più bassa: la vetta in cima, l'ascesa scende verso di te.
  const ladder = [...DIVISIONS].reverse();
  const earnedCount = me.tier + 1;

  return (
    <div className="space-y-10">
      <MobilePageHeader
        eyebrow="Competizione"
        title="La Lega"
        desc="Il tuo percorso, dal Pedone al Re."
      />
      <div className="hidden md:block">
        <h1 className="font-display text-3xl font-semibold tracking-tight">La Lega</h1>
        <p className="mt-2 max-w-2xl text-text-muted">
          Un percorso in sei divisioni, dal Pedone al Re. Ogni partita
          classificata muove il tuo Rating Shakh — e il rating ti fa salire di
          divisione, sbloccando titoli e riconoscimenti.
        </p>
      </div>

      {/* ---------- Hero: Gioca ---------- */}
      <section className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="grid gap-6 p-6 sm:p-8 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-text-muted">
              Partite classificate
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Gioca
            </h2>
            <p className="mt-3 max-w-md text-sm text-text-muted">
              Sfida avversari di tutto il mondo al tuo livello. Ogni risultato
              conta per il rating e ti spinge più in alto nel percorso della
              Lega.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
            <Link
              href="/app/gioca"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-text px-6 text-sm font-medium text-bg transition-opacity hover:opacity-90"
            >
              <Gamepad2 className="h-4 w-4" />
              Gioca online
            </Link>
            <Link
              href="/app/campionato"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-border px-6 text-sm font-medium text-text transition-colors hover:bg-surface-2"
            >
              <Trophy className="h-4 w-4" />
              Il Campionato
            </Link>
          </div>
        </div>
      </section>

      {/* ---------- Standing attuale ---------- */}
      <section className="rounded-2xl border border-text bg-surface-2 p-6 sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-5">
            <span className="text-6xl leading-none" aria-hidden>
              {me.glyph}
            </span>
            <div>
              <p className="text-xs uppercase tracking-wide text-text-muted">
                Divisione attuale · {me.title}
              </p>
              <p className="font-display text-2xl font-semibold">{me.name}</p>
              <p className="font-mono text-sm text-text-muted">
                Rating {rating}
                {provisional && <span className="ml-1.5 text-xs">(provvisorio)</span>}
              </p>
            </div>
          </div>
          <p className="font-mono text-xs uppercase tracking-wide text-text-muted">
            {earnedCount} / {DIVISIONS.length} divisioni
          </p>
        </div>

        {toPromo != null ? (
          <div className="mt-6">
            <div className="mb-1.5 flex justify-between text-xs text-text-muted">
              <span>Verso la promozione</span>
              <span className="font-mono">{toPromo} punti</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-bg">
              <div
                className="h-full rounded-full bg-text transition-all"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
          </div>
        ) : (
          <p className="mt-6 text-sm text-text-muted">
            Sei alla vetta del percorso. Difendi la corona.
          </p>
        )}
      </section>

      {/* ---------- Il Percorso ---------- */}
      <section>
        <div className="mb-5 flex items-baseline justify-between">
          <h2 className="font-display text-xl font-semibold tracking-tight">
            Il Percorso
          </h2>
          <p className="text-xs uppercase tracking-wide text-text-muted">
            Premi e riconoscimenti
          </p>
        </div>

        <ol className="relative space-y-3">
          {/* Spina verticale che collega i nodi (dietro le medaglie). */}
          <span
            className="pointer-events-none absolute bottom-6 left-6 top-6 w-px bg-border sm:left-8"
            aria-hidden
          />

          {ladder.map((d) => {
            const isMe = d.key === me.key;
            const earned = d.tier < me.tier;
            const locked = d.tier > me.tier;
            const band = isFiniteBand(d.max) ? `${d.min}–${d.max}` : `${d.min}+`;

            return (
              <li key={d.key} className="relative">
                <div
                  className={cn(
                    "flex items-start gap-4 rounded-xl border p-4 transition-colors sm:gap-5 sm:p-5",
                    isMe && "border-text bg-surface-2 shadow-sm",
                    earned && "border-border bg-surface",
                    locked && "border-border/60 bg-transparent",
                  )}
                >
                  {/* Medaglione glifo */}
                  <span
                    className={cn(
                      "relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border text-2xl leading-none sm:h-16 sm:w-16 sm:text-3xl",
                      isMe && "border-text bg-text text-bg",
                      earned && "border-border bg-bg text-text",
                      locked && "border-border/60 bg-bg text-text-muted/50",
                    )}
                    aria-hidden
                  >
                    {d.glyph}
                  </span>

                  {/* Corpo */}
                  <div className="min-w-0 flex-1 pt-0.5">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <p
                        className={cn(
                          "font-display text-lg font-semibold",
                          locked && "text-text-muted",
                        )}
                      >
                        {d.name}
                      </p>
                      <p className="font-mono text-xs text-text-muted">{band}</p>
                      <StatePill isMe={isMe} earned={earned} locked={locked} />
                    </div>
                    <p
                      className={cn(
                        "mt-0.5 text-xs uppercase tracking-wide",
                        locked ? "text-text-muted/70" : "text-text-muted",
                      )}
                    >
                      Titolo · {d.title}
                    </p>
                    <p
                      className={cn(
                        "mt-2 text-sm",
                        locked ? "text-text-muted/70" : "text-text-muted",
                      )}
                    >
                      {d.reward}
                    </p>

                    {isMe && toPromo != null && (
                      <Link
                        href="/app/gioca"
                        className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-text underline-offset-4 hover:underline"
                      >
                        Gioca per salire
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}

function StatePill({
  isMe,
  earned,
  locked,
}: {
  isMe: boolean;
  earned: boolean;
  locked: boolean;
}) {
  if (isMe) {
    return (
      <span className="inline-flex items-center rounded-full bg-text px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-bg">
        Tu
      </span>
    );
  }
  if (earned) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-text-muted">
        <Check className="h-3 w-3" /> Conquistato
      </span>
    );
  }
  if (locked) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-text-muted/60">
        <Lock className="h-3 w-3" /> Bloccato
      </span>
    );
  }
  return null;
}

function isFiniteBand(n: number): boolean {
  return Number.isFinite(n);
}
