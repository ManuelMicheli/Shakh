"use client";

import { Menu, Bell, Compass, Target, Crosshair, Wrench, ChevronRight } from "lucide-react";

/**
 * SHOWCASE (dev-only): esempio di pagina (Dashboard) con EMBLEMA in pezzo SVG
 * cburnett realistico (gli stessi della scacchiera), al posto del glifo unicode.
 * Theme-aware: pezzo bianco su tema scuro, pezzo nero su tema chiaro. Mock.
 */

// Cavallo cburnett (data URL base64, dal set della scacchiera).
const KNIGHT_WHITE =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0NSIgaGVpZ2h0PSI0NSI+PGcgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIiBzdHJva2U9IiMwMDAiIHN0cm9rZS13aWR0aD0iMS41IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0yMiAxMGMxMC41IDEgMTYuNSA4IDE2IDI5SDE1YzAtOSAxMC02LjUgOC0yMSIgZmlsbD0iI2ZmZiIvPjxwYXRoIGQ9Ik0yNCAxOGMuMzggMi45MS01LjU1IDcuMzctOCA5LTMgMi0yLjgyIDQuMzQtNSA0LTEuMDQyLS45NCAxLjQxLTMuMDQgMC0zLTEgMCAuMTkgMS4yMy0xIDItMSAwLTQuMDAzIDEtNC00IDAtMiA2LTEyIDYtMTJzMS44OS0xLjkgMi0zLjVjLS43My0uOTk0LS41LTItLjUtMyAxLTEgMyAyLjUgMyAyLjVoMnMuNzgtMS45OTIgMi41LTNjMSAwIDEgMyAxIDMiIGZpbGw9IiNmZmYiLz48cGF0aCBkPSJNOS41IDI1LjVhLjUuNSAwIDEgMS0xIDAgLjUuNSAwIDEgMSAxIDB6bTUuNDMzLTkuNzVhLjUgMS41IDMwIDEgMS0uODY2LS41LjUgMS41IDMwIDEgMSAuODY2LjV6IiBmaWxsPSIjMDAwIi8+PC9nPjwvc3ZnPg==";
const KNIGHT_BLACK =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0NSIgaGVpZ2h0PSI0NSI+PGcgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIiBzdHJva2U9IiMwMDAiIHN0cm9rZS13aWR0aD0iMS41IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0yMiAxMGMxMC41IDEgMTYuNSA4IDE2IDI5SDE1YzAtOSAxMC02LjUgOC0yMSIgZmlsbD0iIzAwMCIvPjxwYXRoIGQ9Ik0yNCAxOGMuMzggMi45MS01LjU1IDcuMzctOCA5LTMgMi0yLjgyIDQuMzQtNSA0LTEuMDQyLS45NCAxLjQxLTMuMDQgMC0zLTEgMCAuMTkgMS4yMy0xIDItMSAwLTQuMDAzIDEtNC00IDAtMiA2LTEyIDYtMTJzMS44OS0xLjkgMi0zLjVjLS43My0uOTk0LS41LTItLjUtMyAxLTEgMyAyLjUgMyAyLjVoMnMuNzgtMS45OTIgMi41LTNjMSAwIDEgMyAxIDMiIGZpbGw9IiMwMDAiLz48cGF0aCBkPSJNOS41IDI1LjVhLjUuNSAwIDEgMS0xIDAgLjUuNSAwIDEgMSAxIDB6bTUuNDMzLTkuNzVhLjUgMS41IDMwIDEgMS0uODY2LS41LjUgMS41IDMwIDEgMSAuODY2LjV6IiBmaWxsPSIjZWNlY2VjIiBzdHJva2U9IiNlY2VjZWMiLz48cGF0aCBkPSJNMjQuNTUgMTAuNGwtLjQ1IDEuNDUuNS4xNWMzLjE1IDEgNS42NSAyLjQ5IDcuOSA2Ljc1UzM1Ljc1IDI5LjA2IDM1LjI1IDM5bC0uMDUuNWgyLjI1bC4wNS0uNWMuNS0xMC4wNi0uODgtMTYuODUtMy4yNS0yMS4zNC0yLjM3LTQuNDktNS43OS02LjY0LTkuMTktNy4xNmwtLjUxLS4xeiIgZmlsbD0iI2VjZWNlYyIgc3Ryb2tlPSJub25lIi8+PC9nPjwvc3ZnPg==";

/** Emblema in pezzo SVG realistico, theme-aware. */
function PieceEmblem() {
  return (
    <span className="pointer-events-none -mt-3 block h-28 w-28 shrink-0 select-none opacity-90">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={KNIGHT_WHITE} alt="" className="hidden h-full w-full dark:block" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={KNIGHT_BLACK} alt="" className="block h-full w-full dark:hidden" />
    </span>
  );
}

export default function SvgEmblemShowcase() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Esempio · Emblema in pezzo SVG realistico
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          Cavallo cburnett (lo stesso della scacchiera) come emblema, al posto del
          glifo unicode. Theme-aware. Confronta con il glifo attuale.
        </p>
      </header>

      <div className="flex justify-center pt-2">
        <PhoneFrame>
          <PhoneChrome />
          <div className="flex-1 overflow-y-auto bg-bg">
            <div className="space-y-5 p-4 pb-10">
              {/* Testata con emblema SVG */}
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-wider text-text-muted">
                      Mercoledì 4 giugno
                    </p>
                    <h2 className="mt-0.5 font-display text-[1.7rem] font-semibold leading-tight tracking-tight">
                      Ciao, Manuel
                    </h2>
                  </div>
                  <PieceEmblem />
                </div>

                <p className="mt-5 text-xs uppercase tracking-wider text-text-muted">
                  Rating Shakh · OTB
                </p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-mono text-5xl font-semibold tabular-nums tracking-tight">
                    1480
                  </span>
                  <span className="font-mono text-sm text-text-muted">± 62</span>
                </div>
                <div className="mt-4 grid grid-cols-4 gap-x-3">
                  {[
                    ["1520", "Tattica"],
                    ["1410", "Finali"],
                    ["1455", "Calcolo"],
                    ["1490", "Gioco"],
                  ].map(([v, l]) => (
                    <div key={l}>
                      <p className="font-mono text-sm tabular-nums">{v}</p>
                      <p className="text-[10px] text-text-muted">{l}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="chess-rule h-1 w-full opacity-70" />

              <div className="rounded-xl border border-border bg-surface p-4">
                <span className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-text-muted">
                  <Compass className="h-3.5 w-3.5" /> Prossimo passo
                </span>
                <h3 className="mt-2 font-display text-lg font-semibold">Inchiodatura sul re</h3>
                <p className="mt-1 text-sm text-text-muted">
                  Un set mirato fissa lo schema.
                </p>
                <button className="mt-3 inline-flex h-10 w-full items-center justify-center gap-1 rounded-lg bg-text text-sm font-medium text-bg">
                  Allenati ora <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  ["Tattiche", Target],
                  ["Punti deboli", Crosshair],
                  ["Ripara", Wrench],
                ].map(([label, Icon]) => {
                  const I = Icon as typeof Target;
                  return (
                    <button
                      key={label as string}
                      className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-surface py-3 text-text-muted"
                    >
                      <I className="h-5 w-5" />
                      <span className="text-[11px] font-medium">{label as string}</span>
                    </button>
                  );
                })}
              </div>
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
