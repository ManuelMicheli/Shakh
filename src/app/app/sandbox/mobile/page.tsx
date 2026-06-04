"use client";

import { useState } from "react";
import {
  Menu,
  Bell,
  Compass,
  Target,
  Crosshair,
  Wrench,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { GlyphWatermark } from "@/components/layout/GlyphWatermark";

/**
 * SHOWCASE (dev-only, raggiungibile solo via URL): redesign mobile della
 * Dashboard in tre direzioni estetiche, tutte "editoriale + texture scacchi".
 * Serve a SCEGLIERE la direzione vedendola dal vivo in una cornice telefono.
 * Dati finti, nessuna chiamata al DB. Non in sidebar.
 */

// ---- Dati finti coerenti col modello reale (DashboardData) ----
const MOCK = {
  name: "Manuel",
  rating: 1480,
  rd: 62,
  provisional: false,
  breakdown: [
    { label: "Tactics", value: 1520 },
    { label: "Endgames", value: 1410 },
    { label: "Calculation", value: 1455 },
    { label: "Play", value: 1490 },
  ],
  stats: [
    { label: "Level", value: "7", sub: "12/40 nodes" },
    { label: "Tactics rating", value: "1520", sub: "+18 · 340 solved" },
    { label: "Streak", value: "9", sub: "best 14" },
    { label: "Accuracy", value: "82%", sub: "23 games" },
  ],
  step: {
    title: "Pin on the king",
    reason:
      "You missed 3 winning pins in your last games. A focused set drills the pattern.",
    cta: "Train now",
  },
};

type Variant = "tabellone" | "editoriale" | "diagramma";

const VARIANTS: { id: Variant; name: string; tag: string }[] = [
  { id: "tabellone", name: "A · Board", tag: "tournament frame" },
  { id: "editoriale", name: "B · Editorial", tag: "serif masthead" },
  { id: "diagramma", name: "C · Diagram", tag: "glyph + data" },
];

export default function MobileShowcasePage() {
  const [variant, setVariant] = useState<Variant>("tabellone");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Mobile redesign · Dashboard
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          Three live directions in the phone frame. Pick the right one and
          I&apos;ll apply it to the real page.
        </p>
      </header>

      {/* Selettore variante */}
      <div className="flex flex-wrap gap-2">
        {VARIANTS.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setVariant(v.id)}
            className={cn(
              "rounded-lg border px-4 py-2 text-left transition-colors",
              variant === v.id
                ? "border-text bg-surface-2"
                : "border-border hover:bg-surface-2",
            )}
          >
            <span className="block text-sm font-medium">{v.name}</span>
            <span className="block text-xs text-text-muted">{v.tag}</span>
          </button>
        ))}
      </div>

      {/* Cornice telefono */}
      <div className="flex justify-center pt-2">
        <PhoneFrame>
          <PhoneChrome />
          <div className="flex-1 overflow-y-auto bg-bg">
            {variant === "tabellone" && <VariantTabellone />}
            {variant === "editoriale" && <VariantEditoriale />}
            {variant === "diagramma" && <VariantDiagramma />}
          </div>
        </PhoneFrame>
      </div>
    </div>
  );
}

/* ============================================================
   Cornice telefono — 390px, scocca, notch.
   ============================================================ */
function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative w-[390px] max-w-full shrink-0 rounded-[2.5rem] border border-border bg-surface p-2 shadow-2xl">
      <div className="relative flex h-[760px] flex-col overflow-hidden rounded-[2rem] border border-border">
        {/* notch */}
        <div className="pointer-events-none absolute left-1/2 top-0 z-20 h-6 w-32 -translate-x-1/2 rounded-b-2xl bg-surface" />
        {children}
      </div>
    </div>
  );
}

/* Topbar app (drawer hamburger raffinato) + striscia damier "da torneo". */
function PhoneChrome() {
  return (
    <div className="shrink-0">
      <div className="flex h-14 items-center justify-between bg-surface px-4 pt-2">
        <button
          type="button"
          aria-label="Open menu"
          className="-ml-1 rounded-md p-1.5 text-text-muted"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="font-display text-lg font-semibold tracking-tight">
          Shakh
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Notifications"
            className="rounded-md p-1.5 text-text-muted"
          >
            <Bell className="h-5 w-5" />
          </button>
          <div className="grid h-8 w-8 place-items-center rounded-full bg-text text-xs font-semibold text-bg">
            M
          </div>
        </div>
      </div>
      {/* regola damier da tabellone */}
      <div className="chess-rule h-1 w-full" />
    </div>
  );
}

/* ============================================================
   VARIANTE A — TABELLONE
   Rating come diagramma incorniciato (telaio + tacche d'angolo),
   tessere statistiche a quadranti separati da fili.
   ============================================================ */
function VariantTabellone() {
  return (
    <div className="space-y-5 p-4 pb-10">
      {/* Testata + rating come un'unica scena: glifo cavallo grande in
          watermark, dal nome fino al rating, tutto visibile (niente clip). */}
      <div className="relative">
        <GlyphWatermark glyph="♞" />

        <div className="relative">
          <p className="text-xs uppercase tracking-wider text-text-muted">
            Wednesday, June 3
          </p>
          <h2 className="mt-0.5 font-display text-2xl font-semibold tracking-tight">
            Hi, {MOCK.name}
          </h2>

          <div className="mt-6 flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider text-text-muted">
              Shakh rating
            </span>
            <span className="text-[10px] uppercase tracking-wide text-text-muted/70">
              · OTB
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-5xl font-semibold tabular-nums tracking-tight">
              {MOCK.rating}
            </span>
            <span className="font-mono text-sm text-text-muted">
              ± {MOCK.rd}
            </span>
          </div>
          <div className="mt-4 grid grid-cols-4 gap-2">
            {MOCK.breakdown.map((b) => (
              <div key={b.label}>
                <p className="font-mono text-sm tabular-nums">{b.value}</p>
                <p className="text-[10px] text-text-muted">{b.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Divisore damier: stacca la testata "editoriale" dalla zona operativa. */}
      <div className="chess-rule h-1 w-full opacity-70" />

      {/* Zona operativa, organizzata in card. */}
      <section className="space-y-3">
        <NextStepBlock />

        <div className="space-y-2">
          <p className="px-0.5 text-[0.7rem] font-medium uppercase tracking-wider text-text-muted/70">
            Train now
          </p>
          <QuickList />
        </div>
      </section>
    </div>
  );
}

/* ============================================================
   VARIANTE B — EDITORIALE
   Masthead serif grande, regola damier, rating inline a sinistra,
   statistiche come chip mono a scorrimento orizzontale.
   ============================================================ */
function VariantEditoriale() {
  return (
    <div className="space-y-6 p-5 pb-10">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-widest text-text-muted">
          The picture of your progress
        </p>
        <h2 className="mt-2 font-display text-4xl font-semibold leading-[1.05] tracking-tight">
          Hi,
          <br />
          {MOCK.name}.
        </h2>
      </div>

      <div className="chess-rule h-1.5 w-full opacity-80" />

      {/* Rating inline editoriale */}
      <div>
        <p className="text-xs uppercase tracking-wider text-text-muted">
          Shakh rating
        </p>
        <div className="mt-1 flex items-baseline gap-3">
          <span className="font-mono text-6xl font-semibold tabular-nums tracking-tighter">
            {MOCK.rating}
          </span>
          <span className="font-mono text-sm text-text-muted">
            ± {MOCK.rd}
          </span>
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {MOCK.breakdown.map((b) => (
            <span
              key={b.label}
              className="shrink-0 rounded-full border border-border px-3 py-1 font-mono text-xs tabular-nums"
            >
              <span className="text-text-muted">{b.label} </span>
              {b.value}
            </span>
          ))}
        </div>
      </div>

      {/* Statistiche come righe editoriali con filo */}
      <div className="divide-y divide-border border-y border-border">
        {MOCK.stats.map((s) => (
          <div
            key={s.label}
            className="flex items-baseline justify-between py-3"
          >
            <div>
              <p className="text-sm">{s.label}</p>
              <p className="font-mono text-[11px] text-text-muted">{s.sub}</p>
            </div>
            <p className="font-display text-2xl font-semibold tabular-nums">
              {s.value}
            </p>
          </div>
        ))}
      </div>

      <NextStepBlock />
      <QuickRow />
    </div>
  );
}

/* ============================================================
   VARIANTE C — DIAGRAMMA
   Glifo cavallo come watermark dietro il rating centrato,
   statistiche essenziali, accenti damier solo nei separatori.
   ============================================================ */
function VariantDiagramma() {
  return (
    <div className="space-y-6 p-5 pb-10">
      <div className="text-center">
        <p className="text-xs uppercase tracking-wider text-text-muted">
          Hi, {MOCK.name}
        </p>
      </div>

      {/* Rating centrato con glifo cavallo watermark */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-surface px-6 py-8 text-center">
        <GlyphWatermark glyph="♞" />
        <p className="text-xs uppercase tracking-wider text-text-muted">
          Shakh rating
        </p>
        <p className="mt-2 font-mono text-6xl font-semibold tabular-nums tracking-tight">
          {MOCK.rating}
        </p>
        <p className="mt-1 font-mono text-sm text-text-muted">
          ± {MOCK.rd} · OTB scale
        </p>
        <div className="mx-auto mt-5 chess-rule h-1 w-24 opacity-70" />
        <div className="mt-5 grid grid-cols-4 gap-2">
          {MOCK.breakdown.map((b) => (
            <div key={b.label}>
              <p className="font-mono text-sm tabular-nums">{b.value}</p>
              <p className="text-[10px] text-text-muted">{b.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Statistiche essenziali in lista mono */}
      <div className="space-y-2">
        {MOCK.stats.map((s) => (
          <div
            key={s.label}
            className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3"
          >
            <span className="text-sm text-text-muted">{s.label}</span>
            <span className="flex items-baseline gap-2">
              <span className="font-display text-xl font-semibold tabular-nums">
                {s.value}
              </span>
              <span className="font-mono text-[11px] text-text-muted">
                {s.sub}
              </span>
            </span>
          </div>
        ))}
      </div>

      <NextStepBlock />
      <QuickRow />
    </div>
  );
}

/* ---- Blocchi condivisi ---- */
function NextStepBlock({
  framed = false,
  bare = false,
}: {
  framed?: boolean;
  bare?: boolean;
}) {
  return (
    <div
      className={cn(
        bare
          ? ""
          : "rounded-xl border border-border bg-surface p-4",
        framed && "chess-corners",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-text-muted">
          <Compass className="h-3.5 w-3.5" /> Next step
        </span>
      </div>
      <h3 className="mt-2 font-display text-lg font-semibold">
        {MOCK.step.title}
      </h3>
      <p className="mt-1 text-sm text-text-muted">{MOCK.step.reason}</p>
      <button
        type="button"
        className="mt-3 inline-flex h-10 w-full items-center justify-center gap-1 rounded-lg bg-text text-sm font-medium text-bg"
      >
        {MOCK.step.cta}
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

/** Azioni operative come righe-card: icona, titolo, dettaglio, chevron. */
function QuickList() {
  const items = [
    {
      label: "Tactics",
      detail: "Daily set · 8 puzzles",
      icon: Target,
    },
    {
      label: "Weaknesses",
      detail: "Pins, rook endgames",
      icon: Crosshair,
    },
    {
      label: "Fix mistakes",
      detail: "3 blunders from recent games",
      icon: Wrench,
    },
  ];
  return (
    <div className="space-y-2">
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <button
            key={it.label}
            type="button"
            className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface p-3 text-left transition-colors hover:bg-surface-2"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-2 text-text">
              <Icon className="h-[1.05rem] w-[1.05rem]" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">{it.label}</span>
              <span className="block truncate text-xs text-text-muted">
                {it.detail}
              </span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-text-muted" />
          </button>
        );
      })}
    </div>
  );
}

function QuickRow({ bare = false }: { bare?: boolean }) {
  const items = [
    { label: "Tactics", icon: Target },
    { label: "Weaknesses", icon: Crosshair },
    { label: "Fix", icon: Wrench },
  ];
  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <button
            key={it.label}
            type="button"
            className={cn(
              "flex flex-col items-center gap-1.5 py-3 text-text-muted",
              bare ? "" : "rounded-xl border border-border bg-surface",
            )}
          >
            <Icon className="h-5 w-5" />
            <span className="text-[11px] font-medium">{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}
