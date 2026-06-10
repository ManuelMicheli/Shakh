"use client";

/**
 * SANDBOX — Anteprima rebranding "Sala Torneo".
 * Pagina dev-only (raggiungibile solo via URL, mai in sidebar) per decidere
 * la nuova palette: 3 varianti di accento × tema dark/light, applicate a
 * componenti realistici tramite override scoped delle CSS variables.
 * Nessun impatto sul resto dell'app: i token globali restano invariati
 * finché la direzione non è approvata.
 */

import { useState } from "react";

// Archivo è ora il font globale dell'app (--font-archivo dal root layout):
// nessun import locale necessario.

type ThemeTokens = {
  bg: string;
  surface: string;
  surface2: string;
  text: string;
  textMuted: string;
  border: string;
  accent: string;
  accentContrast: string;
  boardLight: string;
  boardDark: string;
};

type Variant = {
  id: string;
  nome: string;
  claim: string;
  dark: ThemeTokens;
  light: ThemeTokens;
};

// Neutri condivisi: carbone caldo (dark) / carta da torneo (light).
// La variabile tra le opzioni è SOLO l'accento — il confronto resta pulito.
const NEUTRI_DARK = {
  bg: "#0E0D0B",
  surface: "#161412",
  surface2: "#1E1B18",
  text: "#F2EFE9",
  textMuted: "#9A938A",
  border: "#2A2622",
  boardLight: "#33302B",
  boardDark: "#1B1916",
};

const NEUTRI_LIGHT = {
  bg: "#F5F2EC",
  surface: "#FFFFFF",
  surface2: "#ECE8E0",
  text: "#15130F",
  textMuted: "#6B655C",
  border: "#D8D2C6",
  boardLight: "#E9E4D8",
  boardDark: "#B8AF9D",
};

const VARIANTI: Variant[] = [
  {
    id: "segnale",
    nome: "A — Segnale",
    claim: "Arancio incandescente. Telemetria motorsport, l'orologio è già partito.",
    dark: { ...NEUTRI_DARK, accent: "#FF4D00", accentContrast: "#0D0C0B" },
    light: { ...NEUTRI_LIGHT, accent: "#D63A00", accentContrast: "#FFFFFF" },
  },
  {
    id: "campionato",
    nome: "B — Campionato",
    claim: "Oro da trofeo. La classifica, il premio, la sala con le coppe.",
    dark: { ...NEUTRI_DARK, accent: "#E2A33D", accentContrast: "#15130F" },
    light: { ...NEUTRI_LIGHT, accent: "#A06515", accentContrast: "#FFFFFF" },
  },
  {
    id: "profondita",
    nome: "C — Profondità",
    claim: "Blu elettrico. Il calcolo, la precisione del motore, la linea giusta.",
    dark: { ...NEUTRI_DARK, accent: "#4F7CFF", accentContrast: "#0D0C0B" },
    light: { ...NEUTRI_LIGHT, accent: "#2B54D6", accentContrast: "#FFFFFF" },
  },
];

// Taglio a 45° (angolo dell'alfiere) — elemento firma, in alto a destra.
const CUT_45 = {
  clipPath:
    "polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)",
} as const;

// Posizione di esempio: Italiana, ultima mossa Ac4 (c1→c4 non reale, è demo
// visiva: evidenziamo f1→c4 per mostrare l'highlight arancio sull'ultima mossa).
const SCACCHIERA: (string | null)[][] = [
  ["♜", "♞", "♝", "♛", "♚", null, null, "♜"],
  ["♟", "♟", "♟", "♟", null, "♟", "♟", "♟"],
  [null, null, null, null, null, "♞", null, null],
  [null, null, "♝", null, "♟", null, null, null],
  [null, null, "♗", null, "♙", null, null, null],
  [null, null, null, null, null, "♘", null, null],
  ["♙", "♙", "♙", "♙", null, "♙", "♙", "♙"],
  ["♖", "♘", "♗", "♕", "♔", null, null, "♖"],
];
// Case ultima mossa (f1 → c4) in coordinate riga/colonna della matrice sopra.
const ULTIMA_MOSSA = new Set(["7-5", "4-2"]);

// Colori eval correnti + ricalibrazione proposta per la variante A
// (mistake/miss virano a terracotta per non confondersi con l'accento arancio).
const EVAL_BADGES = [
  { label: "!! Geniale", colore: "#3aa6b9" },
  { label: "★ Migliore", colore: "#5b9a5e" },
  { label: "?! Imprecisione", colore: "#c9a24b" },
  { label: "? Errore", colore: "#cf8a4a", ricalibrato: "#b05c35" },
  { label: "?? Grave", colore: "#c0564a" },
];

const CLASSIFICA = [
  { pos: 1, nome: "Manuel M.", rating: 1447, delta: "+12", tu: true },
  { pos: 2, nome: "Giulia R.", rating: 1439, delta: "+4", tu: false },
  { pos: 3, nome: "Andrea T.", rating: 1418, delta: "-8", tu: false },
  { pos: 4, nome: "Luca B.", rating: 1395, delta: "+21", tu: false },
];

export default function RebrandSandboxPage() {
  const [varianteId, setVarianteId] = useState<string>("segnale");
  const [tema, setTema] = useState<"dark" | "light">("dark");
  const [evalRicalibrati, setEvalRicalibrati] = useState(true);

  const variante = VARIANTI.find((v) => v.id === varianteId) ?? VARIANTI[0];
  const t = variante[tema];

  return (
    <div className="space-y-6">
      {/* ---- Controlli sandbox (fuori dal frame di anteprima) ---- */}
      <header className="space-y-3">
        <h1 className="font-display text-display-sm">
          Rebranding — anteprima &ldquo;Sala Torneo&rdquo;
        </h1>
        <p className="max-w-2xl text-sm text-text-muted">
          Carbone caldo + un solo accento + Archivo Expanded + diagonale 45°.
          Confronta le tre varianti di accento e i due temi: tutto quello che
          vedi nel riquadro usa i token proposti, non quelli attuali.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {VARIANTI.map((v) => (
            <button
              key={v.id}
              onClick={() => setVarianteId(v.id)}
              className={`border px-3 py-1.5 text-sm transition-colors ${
                v.id === varianteId
                  ? "border-text bg-accent text-accent-contrast"
                  : "border-border text-text-muted hover:text-text"
              }`}
            >
              {v.nome}
            </button>
          ))}
          <span className="mx-2 h-5 w-px bg-border" aria-hidden />
          <button
            onClick={() => setTema(tema === "dark" ? "light" : "dark")}
            className="border border-border px-3 py-1.5 text-sm text-text-muted hover:text-text"
          >
            Tema: {tema === "dark" ? "Carbone (dark)" : "Carta (light)"}
          </button>
          <label className="flex items-center gap-2 px-2 text-sm text-text-muted">
            <input
              type="checkbox"
              checked={evalRicalibrati}
              onChange={(e) => setEvalRicalibrati(e.target.checked)}
            />
            Eval ricalibrati (errore → terracotta)
          </label>
        </div>
        <p className="font-mono text-xs text-text-muted">{variante.claim}</p>
      </header>

      {/* ---- Frame di anteprima: i token proposti vivono SOLO qui ---- */}
      <div
        style={{
          backgroundColor: t.bg,
          color: t.text,
          borderColor: t.border,
        }}
        className="border p-6 sm:p-8"
      >
        <div className="mx-auto max-w-5xl space-y-8">
          {/* Barra telemetria: rating monumentale + delta */}
          <section
            style={{ borderColor: t.border }}
            className="flex flex-wrap items-end justify-between gap-4 border-b pb-6"
          >
            <div>
              <p
                style={{ color: t.textMuted }}
                className="font-mono text-xs uppercase tracking-widest"
              >
                Shakh Rating
              </p>
              <p
                style={{
                  fontFamily: "var(--font-archivo)",
                  fontVariationSettings: "'wdth' 125",
                  fontWeight: 900,
                  letterSpacing: "-0.02em",
                  lineHeight: 1,
                }}
                className="text-7xl"
              >
                1447
              </p>
            </div>
            <div className="flex items-center gap-6">
              <p
                style={{ color: t.accent }}
                className="font-mono text-2xl font-bold tabular-nums"
              >
                ◢ +12
              </p>
              <div className="text-right">
                <p
                  style={{ color: t.textMuted }}
                  className="font-mono text-xs uppercase tracking-widest"
                >
                  Lega · Girone B
                </p>
                <p
                  style={{
                    fontFamily: "var(--font-archivo)",
                    fontVariationSettings: "'wdth' 125",
                    fontWeight: 900,
                  }}
                  className="text-3xl"
                >
                  1°
                </p>
              </div>
            </div>
          </section>

          {/* Titolo sezione + bottoni */}
          <section className="space-y-4">
            <h2
              style={{
                fontFamily: "var(--font-archivo)",
                fontVariationSettings: "'wdth' 125",
                fontWeight: 800,
              }}
              className="text-2xl uppercase"
            >
              Il tuo prossimo round
            </h2>
            <div className="flex flex-wrap gap-3">
              <button
                style={{
                  backgroundColor: t.accent,
                  color: t.accentContrast,
                  ...CUT_45,
                }}
                className="px-6 py-3 text-sm font-bold uppercase tracking-wide"
              >
                Gioca ora
              </button>
              <button
                style={{ borderColor: t.text, color: t.text }}
                className="border px-6 py-3 text-sm font-medium"
              >
                Analizza l&apos;ultima partita
              </button>
              <button
                style={{ color: t.textMuted }}
                className="px-4 py-3 text-sm"
              >
                Ripasso tattico →
              </button>
            </div>
          </section>

          {/* Griglia: scacchiera + coach + classifica */}
          <section className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            {/* Scacchiera nei colori del tema */}
            <div
              style={{ backgroundColor: t.surface, borderColor: t.border, ...CUT_45 }}
              className="border p-4"
            >
              <p
                style={{ color: t.textMuted }}
                className="mb-3 font-mono text-xs uppercase tracking-widest"
              >
                Sparring · Italiana — C50
              </p>
              <div
                className="grid aspect-square w-full max-w-md grid-cols-8 overflow-hidden"
                style={{ border: `1px solid ${t.border}` }}
              >
                {SCACCHIERA.map((riga, r) =>
                  riga.map((pezzo, c) => {
                    const scura = (r + c) % 2 === 1;
                    const evidenziata = ULTIMA_MOSSA.has(`${r}-${c}`);
                    return (
                      <div
                        key={`${r}-${c}`}
                        style={{
                          backgroundColor: evidenziata
                            ? `color-mix(in srgb, ${t.accent} 45%, ${scura ? t.boardDark : t.boardLight})`
                            : scura
                              ? t.boardDark
                              : t.boardLight,
                          color: t.text,
                        }}
                        className="flex items-center justify-center text-2xl leading-none sm:text-3xl"
                      >
                        {pezzo}
                      </div>
                    );
                  }),
                )}
              </div>
              <p
                style={{ color: t.textMuted }}
                className="mt-3 font-mono text-sm tabular-nums"
              >
                4. Ac4 Ac5 · eval{" "}
                <span style={{ color: t.text }} className="font-bold">
                  +0.3
                </span>{" "}
                · prof. 18
              </p>
            </div>

            <div className="space-y-6">
              {/* Pannello coach */}
              <div
                style={{ backgroundColor: t.surface, borderColor: t.border }}
                className="border p-4"
              >
                <p
                  style={{ color: t.accent }}
                  className="mb-2 font-mono text-xs font-bold uppercase tracking-widest"
                >
                  Coach
                </p>
                <p className="text-sm leading-relaxed">
                  <span className="font-mono font-bold">Ac4</span> punta il
                  punto debole <span className="font-mono font-bold">f7</span>,
                  difeso solo dal re. Insieme a{" "}
                  <span className="font-mono font-bold">Cg5</span> crea la
                  minaccia concreta sulla diagonale — per questo il 78% dei
                  giocatori sopra i 1800 risponde{" "}
                  <span className="font-mono font-bold">Ac5</span> o{" "}
                  <span className="font-mono font-bold">Ae7</span>.
                </p>
              </div>

              {/* Classifica Lega */}
              <div
                style={{ backgroundColor: t.surface, borderColor: t.border }}
                className="border p-4"
              >
                <p
                  style={{ color: t.textMuted }}
                  className="mb-3 font-mono text-xs uppercase tracking-widest"
                >
                  Classifica girone
                </p>
                <table className="w-full text-sm">
                  <tbody>
                    {CLASSIFICA.map((r) => (
                      <tr
                        key={r.pos}
                        style={{
                          borderColor: t.border,
                          backgroundColor: r.tu ? t.surface2 : "transparent",
                        }}
                        className="border-b last:border-b-0"
                      >
                        <td className="py-2 pr-3 font-mono tabular-nums">
                          {r.pos}
                        </td>
                        <td className="py-2 pr-3">
                          {r.nome}
                          {r.tu && (
                            <span
                              style={{ color: t.accent }}
                              className="ml-2 font-mono text-xs font-bold uppercase"
                            >
                              tu
                            </span>
                          )}
                        </td>
                        <td className="py-2 pr-3 text-right font-mono tabular-nums">
                          {r.rating}
                        </td>
                        <td
                          style={{
                            color: r.delta.startsWith("+")
                              ? t.accent
                              : t.textMuted,
                          }}
                          className="py-2 text-right font-mono tabular-nums"
                        >
                          {r.delta.startsWith("+") ? "◢ " : "◥ "}
                          {r.delta}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Badge eval: l'unica eccezione cromatica, confinata all'analisi */}
          <section className="space-y-3">
            <p
              style={{ color: t.textMuted }}
              className="font-mono text-xs uppercase tracking-widest"
            >
              Colori eval (solo contesto analisi){" "}
              {evalRicalibrati && "— ? Errore ricalibrato terracotta"}
            </p>
            <div className="flex flex-wrap gap-2">
              {EVAL_BADGES.map((b) => {
                const colore =
                  evalRicalibrati && b.ricalibrato ? b.ricalibrato : b.colore;
                return (
                  <span
                    key={b.label}
                    style={{
                      backgroundColor: `color-mix(in srgb, ${colore} 18%, ${t.surface})`,
                      color: colore,
                      borderColor: `color-mix(in srgb, ${colore} 40%, ${t.border})`,
                    }}
                    className="border px-3 py-1 font-mono text-sm"
                  >
                    {b.label}
                  </span>
                );
              })}
            </div>
          </section>

          {/* Specimen tipografico: Archivo vs sistema attuale */}
          <section
            style={{ borderColor: t.border }}
            className="grid gap-6 border-t pt-6 md:grid-cols-2"
          >
            <div>
              <p
                style={{ color: t.textMuted }}
                className="mb-2 font-mono text-xs uppercase tracking-widest"
              >
                Proposto — Archivo Expanded
              </p>
              <p
                style={{
                  fontFamily: "var(--font-archivo)",
                  fontVariationSettings: "'wdth' 125",
                  fontWeight: 900,
                }}
                className="text-3xl uppercase leading-tight"
              >
                Difesa Siciliana
              </p>
              <p
                style={{ fontFamily: "var(--font-archivo)" }}
                className="mt-2 text-sm leading-relaxed"
              >
                Il Najdorf è la risposta più ambiziosa: il Nero ritarda lo
                sviluppo per controllare e4 e preparare la spinta b5.
              </p>
            </div>
            <div>
              <p
                style={{ color: t.textMuted }}
                className="mb-2 font-mono text-xs uppercase tracking-widest"
              >
                Attuale — Fraunces / Inter
              </p>
              <p className="font-display text-3xl leading-tight">
                Difesa Siciliana
              </p>
              <p className="mt-2 text-sm leading-relaxed">
                Il Najdorf è la risposta più ambiziosa: il Nero ritarda lo
                sviluppo per controllare e4 e preparare la spinta b5.
              </p>
            </div>
          </section>

          {/* Riepilogo token della variante attiva */}
          <section className="space-y-2">
            <p
              style={{ color: t.textMuted }}
              className="font-mono text-xs uppercase tracking-widest"
            >
              Token — {variante.nome} · {tema}
            </p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(t).map(([nome, hex]) => (
                <span
                  key={nome}
                  style={{ borderColor: t.border }}
                  className="flex items-center gap-2 border px-2 py-1 font-mono text-xs"
                >
                  <span
                    style={{
                      backgroundColor: hex,
                      border: `1px solid ${t.border}`,
                    }}
                    className="inline-block h-4 w-4"
                  />
                  {nome} {hex}
                </span>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
