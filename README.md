# Shakh

Piattaforma di apprendimento scacchistico. Coach AI in italiano ancorato a dati
oggettivi (Stockfish + Lichess). Questo repo contiene le **fondamenta** (prompt 00):
i moduli di prodotto (scacchiera, motore, analisi, tattiche, teoria, percorso, coach)
arrivano nei prompt 01–10.

## Stack

Next.js 15 (App Router) · TypeScript strict · Tailwind CSS 4 · Supabase (Postgres + Auth + RLS) · Framer Motion · GSAP · Lenis · font self-hosted (Fraunces / Inter / JetBrains Mono).

## Setup

```bash
npm install
cp .env.example .env.local   # poi compila le chiavi Supabase + Anthropic
npm run dev
```

Variabili (`.env.local`):

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY` (predisposta, non ancora usata)
- `NEXT_PUBLIC_APP_URL`

## Database

Migration in `supabase/migrations/`. Applicabile da zero:

```bash
supabase db push          # oppure incolla 0001_init.sql nell'SQL editor
```

Crea tabelle, enum, trigger (`profiles` auto al signup, `updated_at`) e policy RLS.

## Motore (Stockfish WASM)

Build **lite single-thread** (Stockfish 16, pacchetto npm `stockfish`): gira ovunque
**senza** header COOP/COEP. I file (`.js` + `.wasm` + `.nnue`) sono serviti localmente da
`/engine/`, copiati da `node_modules` via `scripts/copy-engine.mjs` (gira in `postinstall`
e `prebuild`). La cartella `public/engine/` è git-ignored.

Caricamento **lazy**: il WASM si carica solo alla prima analisi, in un web worker
(`src/lib/engine/engine.ts`, singleton). Per passare alla **full multi-thread** in futuro:
sostituire il file worker con `stockfish-nnue-16.js` + `.wasm` e abilitare gli header
COOP/COEP in `next.config.ts` (vedi commento lì). Non farlo ora.

## Struttura

- `src/app` — route (marketing, auth, shell `/app`)
- `src/components/ui` — primitivi del design system
- `src/components/layout` — Sidebar / Topbar / AppShell
- `src/lib/supabase` — client browser/server + middleware sessione
- `src/config` — `brand.ts`, `site.ts`
- `src/styles/globals.css` — design token (CSS variables) + temi
