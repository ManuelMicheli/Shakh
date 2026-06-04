"use client";

import { Menu, Bell, ChevronRight, ArrowRight } from "lucide-react";

/**
 * SHOWCASE (dev-only): redesign mobile della pagina Teoria. Editoriale + texture
 * scacchi. Header + glifo alfiere, sezioni per ramo con lezioni a list-card. Mock.
 */

const RAMI: {
  title: string;
  browse: string;
  lessons: { title: string; summary: string; eco?: string }[];
}[] = [
  {
    title: "Openings",
    browse: "Browse the ECO tree",
    lessons: [
      {
        title: "Sicilian Defense",
        summary: "The most played asymmetrical counterattack.",
        eco: "B20",
      },
      {
        title: "Italian Game",
        summary: "Quick development and pressure on f7.",
        eco: "C50",
      },
    ],
  },
  {
    title: "Middlegame",
    browse: "Browse the themes",
    lessons: [
      {
        title: "Isolated pawns",
        summary: "Dynamic strength against static weakness.",
      },
      {
        title: "Open files",
        summary: "Where to place the rooks and why.",
      },
    ],
  },
  {
    title: "Endgames",
    browse: "Browse all endgames",
    lessons: [
      {
        title: "King and pawn vs king",
        summary: "Opposition and the rule of the square.",
      },
    ],
  },
];

export default function TeoriaShowcasePage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Mobile redesign · Theory
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          Sections by branch, lessons as list cards. Take a look and confirm.
        </p>
      </header>

      <div className="flex justify-center pt-2">
        <PhoneFrame>
          <PhoneChrome />
          <div className="flex-1 overflow-y-auto bg-bg">
            <div className="space-y-6 p-4 pb-10">
              {/* Testata + glifo alfiere */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-wider text-text-muted">
                    Guided study
                  </p>
                  <h2 className="mt-0.5 font-display text-[1.7rem] font-semibold leading-tight tracking-tight">
                    Theory
                  </h2>
                  <p className="mt-2 text-sm text-text-muted">
                    Understand the <em>why</em> behind the moves, with real data.
                  </p>
                </div>
                <span
                  aria-hidden
                  className="-mt-4 shrink-0 select-none font-display text-[9rem] leading-none text-text opacity-20"
                >
                  ♝
                </span>
              </div>

              {RAMI.map((ramo, i) => (
                <section key={i} className="space-y-3">
                  {/* Intestazione ramo */}
                  <div className="flex items-center gap-3">
                    <h3 className="font-display text-xl font-semibold tracking-tight">
                      {ramo.title}
                    </h3>
                    <div className="chess-rule h-1 flex-1 opacity-60" />
                  </div>

                  {/* Lezioni */}
                  <div className="space-y-2">
                    {ramo.lessons.map((l, li) => (
                      <button
                        key={li}
                        type="button"
                        className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface p-3 text-left transition-colors hover:bg-surface-2"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium">
                              {l.title}
                            </span>
                            {l.eco && (
                              <span className="shrink-0 font-mono text-xs text-text-muted">
                                {l.eco}
                              </span>
                            )}
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-text-muted">
                            {l.summary}
                          </span>
                        </span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-text-muted" />
                      </button>
                    ))}

                    {/* Sfoglia tutto */}
                    <button
                      type="button"
                      className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border bg-surface px-3 py-2.5 text-sm font-medium text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
                    >
                      {ramo.browse}
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </section>
              ))}
            </div>
          </div>
        </PhoneFrame>
      </div>
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
          <button type="button" aria-label="Notifications" className="rounded-md p-1.5 text-text-muted">
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
