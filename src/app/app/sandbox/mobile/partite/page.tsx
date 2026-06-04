"use client";

import { useState } from "react";
import { Menu, Bell, Upload, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * SHOWCASE (dev-only): redesign mobile di "Le mie partite". Direzione editoriale
 * + texture scacchi. Card partita con esito (V/P/S) derivato, avversario,
 * metadati, stato analisi. Dati finti.
 */

type Outcome = "win" | "draw" | "loss";

const GAMES: {
  opponent: string;
  youColor: "White" | "Black";
  outcome: Outcome;
  result: string;
  source: string;
  date: string;
  eco: string;
  analyzed: boolean;
}[] = [
  {
    opponent: "M. Rossi",
    youColor: "White",
    outcome: "win",
    result: "1–0",
    source: "Lichess",
    date: "Jun 2, 2026",
    eco: "B90",
    analyzed: true,
  },
  {
    opponent: "A. Bianchi",
    youColor: "Black",
    outcome: "loss",
    result: "1–0",
    source: "Chess.com",
    date: "Jun 1, 2026",
    eco: "C65",
    analyzed: true,
  },
  {
    opponent: "L. Verdi",
    youColor: "White",
    outcome: "draw",
    result: "½–½",
    source: "PGN",
    date: "May 30, 2026",
    eco: "D37",
    analyzed: false,
  },
  {
    opponent: "G. Neri",
    youColor: "Black",
    outcome: "win",
    result: "0–1",
    source: "Lichess",
    date: "May 28, 2026",
    eco: "B22",
    analyzed: false,
  },
];

const OUTCOME: Record<Outcome, { letter: string; label: string; cls: string }> = {
  win: { letter: "W", label: "Win", cls: "bg-text text-bg" },
  draw: { letter: "½", label: "Draw", cls: "border border-border text-text" },
  loss: { letter: "L", label: "Loss", cls: "bg-surface-2 text-text-muted" },
};

export default function PartiteShowcasePage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Mobile redesign · My games
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          Derived outcome (W/D/L), opponent, analysis status. Take a look and
          confirm.
        </p>
      </header>

      <div className="flex justify-center pt-2">
        <PhoneFrame>
          <PhoneChrome />
          <div className="flex-1 overflow-y-auto bg-bg">
            <div className="space-y-5 p-4 pb-10">
              {/* Testata: testo a sinistra, glifo torre libero a destra (non coperto) */}
              <div className="relative">
                <div className="relative">
                  <p className="text-xs uppercase tracking-wider text-text-muted">
                    Archive
                  </p>
                  <h2 className="mt-0.5 font-display text-[1.7rem] font-semibold leading-tight tracking-tight">
                    My games
                  </h2>
                  <p className="mt-2 text-sm text-text-muted">
                    Import, analyze, review move by move.
                  </p>
                </div>
              </div>

              {/* Import: mini-tab + barra input */}
              <ImportTabs />

              {/* Divisore damier */}
              <div className="chess-rule h-1 w-full opacity-70" />

              {/* Lista partite */}
              <section className="space-y-2">
                <div className="flex items-center justify-between px-0.5">
                  <p className="text-[0.7rem] font-medium uppercase tracking-wider text-text-muted/70">
                    {GAMES.length} games
                  </p>
                </div>
                <div className="space-y-2">
                  {GAMES.map((g, i) => (
                    <GameCard key={i} game={g} />
                  ))}
                </div>
              </section>
            </div>
          </div>
        </PhoneFrame>
      </div>
    </div>
  );
}

type ImportSource = "chesscom" | "lichess" | "import";

const IMPORT_TABS: { id: ImportSource; label: string }[] = [
  { id: "chesscom", label: "Chess.com" },
  { id: "lichess", label: "Lichess" },
  { id: "import", label: "Import" },
];

function ImportTabs() {
  const [tab, setTab] = useState<ImportSource>("chesscom");

  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface p-3">
      {/* Mini-tab segmentata */}
      <div className="flex gap-1 rounded-lg bg-surface-2 p-1">
        {IMPORT_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
              tab === t.id
                ? "bg-text text-bg"
                : "text-text-muted hover:text-text",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Barra da riempire */}
      {tab === "import" ? (
        <div className="space-y-2">
          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-surface-2 px-3 py-2.5 text-sm font-medium text-text"
          >
            <Upload className="h-4 w-4" /> Paste PGN or upload a .pgn file
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <input
            readOnly
            placeholder={
              tab === "chesscom"
                ? "Chess.com username"
                : "Lichess username"
            }
            className="min-w-0 flex-1 rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm text-text placeholder:text-text-muted/70"
          />
          <button
            type="button"
            className="shrink-0 rounded-lg bg-text px-4 py-2.5 text-sm font-medium text-bg"
          >
            Import
          </button>
        </div>
      )}
    </div>
  );
}

function GameCard({
  game,
}: {
  game: (typeof GAMES)[number];
}) {
  const o = OUTCOME[game.outcome];
  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      {/* Riga principale: esito + avversario + azione */}
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg leading-none",
            o.cls,
          )}
          title={o.label}
        >
          <span className="font-mono text-base font-semibold">{o.letter}</span>
          <span className="mt-0.5 font-mono text-[10px] tabular-nums opacity-80">
            {game.result}
          </span>
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">vs {game.opponent}</p>
          <p className="mt-0.5 truncate text-xs text-text-muted">
            {game.youColor} · {game.source} · {game.date}
            <span className="font-mono"> · {game.eco}</span>
          </p>
        </div>

        <button
          type="button"
          className={cn(
            "inline-flex h-9 shrink-0 items-center rounded-lg px-4 text-sm font-medium",
            game.analyzed
              ? "border border-border bg-surface-2 text-text"
              : "bg-text text-bg",
          )}
        >
          {game.analyzed ? "Review" : "Analyze"}
        </button>

        <button
          type="button"
          aria-label="Delete"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-text-muted hover:bg-surface-2"
        >
          <Trash2 className="h-4 w-4" />
        </button>
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
