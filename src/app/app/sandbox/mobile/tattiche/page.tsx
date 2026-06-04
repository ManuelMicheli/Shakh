"use client";

import {
  Menu,
  Bell,
  Infinity as InfinityIcon,
  Target,
  RotateCcw,
  Timer,
  ChevronRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * SHOWCASE (dev-only): redesign mobile del Hub Tattiche. Editoriale + texture
 * scacchi. Header + glifo donna, rating hero, modalità a list-card. Mock.
 */

const STATS = { rating: 1520, currentStreak: 9, bestStreak: 14, solved: 340 };

const MODES: {
  title: string;
  desc: string;
  icon: LucideIcon;
  badge?: string;
}[] = [
  {
    title: "Adattivo",
    desc: "Flusso continuo al tuo livello. Aggiorna rating e serie.",
    icon: InfinityIcon,
  },
  {
    title: "Per tema",
    desc: "Allena un motivo: forchetta, inchiodatura, finali…",
    icon: Target,
  },
  {
    title: "Ripasso",
    desc: "Rivedi i puzzle sbagliati in scadenza.",
    icon: RotateCcw,
    badge: "5 in scadenza",
  },
  {
    title: "Sfida a tempo",
    desc: "3 minuti, difficoltà crescente: quanti ne risolvi?",
    icon: Timer,
  },
];

export default function TatticheShowcasePage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Redesign mobile · Tattiche
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          Rating hero + modalità a list-card. Guarda e conferma.
        </p>
      </header>

      <div className="flex justify-center pt-2">
        <PhoneFrame>
          <PhoneChrome />
          <div className="flex-1 overflow-y-auto bg-bg">
            <div className="space-y-5 p-4 pb-10">
              {/* Testata + glifo donna + rating hero */}
              <div className="relative">
                <div className="relative">
                  <p className="text-xs uppercase tracking-wider text-text-muted">
                    Visione tattica
                  </p>
                  <h2 className="mt-0.5 font-display text-[1.7rem] font-semibold leading-tight tracking-tight">
                    Tattiche
                  </h2>

                  <div className="mt-6 flex items-center gap-2">
                    <span className="text-xs uppercase tracking-wider text-text-muted">
                      Rating tattico
                    </span>
                  </div>
                  <div className="mt-1 font-mono text-5xl font-semibold tabular-nums tracking-tight">
                    {STATS.rating}
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-x-3">
                    <Mini label="Serie" value={STATS.currentStreak} />
                    <Mini label="Record" value={STATS.bestStreak} />
                    <Mini label="Risolti" value={STATS.solved} />
                  </div>
                </div>
              </div>

              <div className="chess-rule h-1 w-full opacity-70" />

              {/* Modalità */}
              <section className="space-y-2">
                <p className="px-0.5 text-[0.7rem] font-medium uppercase tracking-wider text-text-muted/70">
                  Allenati
                </p>
                <div className="space-y-2">
                  {MODES.map((m) => {
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.title}
                        type="button"
                        className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface p-3 text-left transition-colors hover:bg-surface-2"
                      >
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-surface-2 text-text">
                          <Icon className="h-5 w-5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="text-sm font-medium">{m.title}</span>
                            {m.badge && (
                              <span className="shrink-0 rounded-full bg-text px-2 py-0.5 text-[10px] font-medium text-bg">
                                {m.badge}
                              </span>
                            )}
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-text-muted">
                            {m.desc}
                          </span>
                        </span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-text-muted" />
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>
          </div>
        </PhoneFrame>
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="font-mono text-lg font-semibold tabular-nums">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-text-muted">{label}</p>
    </div>
  );
}

/* ---- Cornice telefono ---- */
function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative w-[390px] max-w-full shrink-0 rounded-[2.5rem] border border-border bg-surface p-2 shadow-2xl">
      <div className="relative flex h-[760px] flex-col overflow-hidden rounded-[2rem] border border-border">
        <div className="pointer-events-none absolute left-1/2 top-0 z-20 h-6 w-32 -translate-x-1/2 rounded-b-2xl bg-surface" />
        {children}
      </div>
    </div>
  );
}

function PhoneChrome() {
  return (
    <div className="shrink-0">
      <div className="flex h-14 items-center justify-between bg-surface px-4 pt-2">
        <button type="button" aria-label="Menu" className="-ml-1 rounded-md p-1.5 text-text-muted">
          <Menu className="h-5 w-5" />
        </button>
        <span className="font-display text-lg font-semibold tracking-tight">Shakh</span>
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Notifiche" className="rounded-md p-1.5 text-text-muted">
            <Bell className="h-5 w-5" />
          </button>
          <div className="grid h-8 w-8 place-items-center rounded-full bg-text text-xs font-semibold text-bg">
            M
          </div>
        </div>
      </div>
      <div className="chess-rule h-1 w-full" />
    </div>
  );
}
