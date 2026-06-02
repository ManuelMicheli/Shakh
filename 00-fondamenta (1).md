# PROMPT 00 — Fondamenta & Setup

> **Progetto:** Shakh — piattaforma di apprendimento scacchistico (vedi `BRAND_NAME`)
> **Questo prompt:** crea SOLO le fondamenta. Niente feature di prodotto. Obiettivo: un progetto Next.js 15 funzionante, con design system, schema database completo, autenticazione e shell dell'app, pronto a ricevere i moduli successivi.
> **NON fare:** scacchiera, motore, analisi partite, coach AI, tattiche, teoria, percorso guidato. Quelli arrivano nei prompt 01–10. Se sei tentato di anticiparli, fermati.

---

## 1. Contesto del prodotto

Shakh è una piattaforma web che porta un utente **da principiante assoluto a giocatore di club forte (1800–2200)**, e che resta utile nel tempo per migliorare. Non promette di "diventare Gran Maestro": quello è lo spirito del brand, non l'obiettivo letterale.

Architettura a strati (da tenere a mente già ora nel data model, anche se costruiamo solo lo Strato 0):

- **Strato 0 — giocatore individuale** (il prodotto vero, l'unico che costruiamo all'inizio): percorso guidato, teoria interattiva, tattiche, analisi delle proprie partite, coach AI.
- **Strato 1 — istruttore / circolo** (V3, NON ora): vista aggregata sugli stessi dati, dashboard classe, assegnazioni. Il data model nasce già pronto a reggerlo (membership a gruppi nullable, progressi granulari, contenuti assegnabili).

Il differenziatore del prodotto è il **coach AI in italiano** che spiega il *perché* delle mosse, ancorato a dati oggettivi (motore Stockfish + statistiche reali via API Lichess). Questo prompt non lo implementa, ma tutta l'architettura serve quello.

---

## 2. Stack tecnico (versioni esatte)

- **Next.js 15** (App Router, React Server Components dove sensato, Server Actions)
- **TypeScript** in strict mode
- **Tailwind CSS 4**
- **Supabase** (Postgres + Auth + RLS) — client `@supabase/ssr`
- **Vercel** come target di deploy
- **Framer Motion** per micro-interazioni, **GSAP** per animazioni di scena, **Lenis** per smooth scroll
- Font self-hosted via `next/font` (vedi §5, requisito GDPR: nessuna chiamata a Google Fonts)

Librerie scacchistiche (installale ora, le useranno i prompt successivi — NON costruire nulla con esse in questo prompt):

- `chessground` — board UI di Lichess (rendering + interazioni, NON valida le mosse)
- `chess.js` — regole, validazione mosse, generazione mosse legali, gestione PGN/FEN
- Stockfish via WASM: arriverà nel prompt 02; NON installare il binario ora.

Per le chiamate AI useremo l'**Anthropic API** (prompt 04). Predisponi solo la variabile d'ambiente, non il client.

---

## 3. Setup iniziale

1. Inizializza un progetto Next.js 15 con TypeScript, App Router, Tailwind 4, ESLint, alias `@/*`.
2. Installa: `@supabase/supabase-js @supabase/ssr framer-motion gsap lenis chessground chess.js clsx tailwind-merge lucide-react`.
3. Crea `.env.example` e `.env.local` con:
   ```
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_ROLE_KEY=
   ANTHROPIC_API_KEY=
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```
   `.env.local` NON deve mai finire in git. Aggiorna `.gitignore` (Next.js standard + `.env*.local`, `.vercel`).
4. Crea `.env.example` committabile con le stesse chiavi vuote.

---

## 4. Configurazione globale

- `BRAND_NAME` come costante in `src/config/brand.ts` (valore: `"Shakh"`), usata ovunque per il nome — così è cambiabile in un punto solo.
- File `src/config/site.ts` con metadati base (nome, descrizione, url, locale `it-IT`).
- Locale di default **italiano**. Predisponi la struttura per i18n ma NON installare librerie i18n ora (arriva nel prompt 10).

---

## 5. Design System

Estetica: **editoriale, sobria, "da studio"**. Tutto deve sembrare uno strumento serio per concentrarsi sulla scacchiera, non un videogioco. Riferimento di qualità: livello Awwwards, ma al servizio della leggibilità durante lo studio prolungato. Segui principi di gerarchia tipografica forte, molto spazio bianco/negativo, contrasto pulito.

### Tema

Doppio tema chiaro/scuro, **scuro di default** (studio serale). Implementa con CSS variables + class strategy di Tailwind (`dark`). Persisti la scelta utente (cookie o localStorage), con `prefers-color-scheme` come fallback iniziale e nessun flash (FOUC) al caricamento.

### Palette (definiscile come CSS variables, questi sono i valori di partenza)

Identità **bianco e nero classica**, monocromatica — come una scacchiera. Nessun colore d'accento decorativo: l'interfaccia vive di nero, bianco e grigi neutri. L'azione primaria si esprime per **inversione** (tema scuro → bottone chiaro su testo scuro; tema chiaro → bottone scuro su testo chiaro), non con un colore. Niente nero/bianco puri al 100% per non affaticare la vista nello studio prolungato.

**Tema scuro (default)**
- `--bg`: `#0E0E0E`
- `--surface`: `#161616`
- `--surface-2`: `#1F1F1F`
- `--text`: `#FAFAFA`
- `--text-muted`: `#9A9A9A`
- `--border`: `#2A2A2A`

**Tema chiaro**
- `--bg`: `#FFFFFF`
- `--surface`: `#F7F7F7`
- `--surface-2`: `#EFEFEF`
- `--text`: `#0E0E0E`
- `--text-muted`: `#6B6B6B`
- `--border`: `#E2E2E2`

**Accento** — predisposto ma neutro per ora, così aggiungerne uno in futuro è una modifica di una riga:
- `--accent`: eredita `--text` del tema corrente (azione per inversione)
- `--accent-contrast`: eredita `--bg` del tema corrente

**Colori semantici per l'analisi partite — ECCEZIONE FUNZIONALE, unica eccezione al bianco/nero.** Non sono decorazione: distinguere a colpo d'occhio un errore grave da una mossa ottima è una necessità d'uso, impossibile in puro monocromatico. Compaiono **solo** nel contesto dell'analisi/valutazione, mai nella UI generale. Definiscili ora come variabili (li useranno i prompt 03/04), tenuti volutamente desaturati per non rompere l'estetica sobria:
- `--eval-brilliant`: `#3AA6B9`
- `--eval-best`: `#5B9A5E`
- `--eval-good`: `#8A9A6B`
- `--eval-inaccuracy`: `#C9A24B`
- `--eval-mistake`: `#CF8A4A`
- `--eval-blunder`: `#C0564A`

### Tipografia (self-hosted via `next/font/local` o `next/font/google` con `display: swap`, ma i file font devono essere serviti dal nostro dominio per conformità GDPR)

- **Display / titoli:** Fraunces (variabile, pesi 400–600, opsz alto per i titoli grandi)
- **Testo / UI:** Inter
- **Notazione scacchistica (SAN, FEN, PGN, valutazioni numeriche):** JetBrains Mono — usala SEMPRE per qualsiasi notazione di mosse, codici ECO, valutazioni `+1.4`, stringhe FEN. È una regola di prodotto, non estetica.

Scala tipografica fluida (clamp) per i titoli display.

### Componenti UI di base da creare ora

Crea una piccola libreria di primitivi (in `src/components/ui/`), accessibili, coerenti col design system, SENZA logica di prodotto:
`Button` (varianti: primary/secondary/ghost/danger), `Card`, `Input`, `Label`, `Badge`, `Tabs`, `Dialog/Modal`, `Tooltip`, `Skeleton`, `Toast`, `Avatar`, `ThemeToggle`, `Spinner`.

Usa `clsx` + `tailwind-merge` per la composizione delle classi. Niente librerie di componenti esterne pesanti.

---

## 6. Schema Database (Supabase / Postgres)

Crea le migration SQL in `supabase/migrations/`. Questo schema è la **fondazione di tutto**: deve nascere già pronto per gli strati futuri (istruttore/circolo, progressi granulari, contenuti assegnabili), anche se ora popoliamo solo lo Strato 0.

Principi:
- Ogni tabella con dati utente ha **RLS attivo**.
- Progressi tracciati in modo **granulare per dimensione/pattern**, non come semplici flag "completato".
- Entità gruppo/circolo **opzionale** (un utente può appartenere a zero o più gruppi).
- Contenuti **assegnabili** a un utente o a un gruppo.

```sql
-- ============================================================
-- ESTENSIONI
-- ============================================================
create extension if not exists "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================
create type user_role as enum ('player', 'instructor', 'admin');
create type group_type as enum ('circolo', 'classe', 'scuola');
create type group_member_role as enum ('member', 'instructor', 'owner');
create type content_type as enum ('opening', 'middlegame', 'endgame');
create type piece_color as enum ('white', 'black');
create type game_source as enum ('pgn', 'lichess', 'chesscom');
create type move_classification as enum ('brilliant','best','good','inaccuracy','mistake','blunder','book');
create type assignment_target as enum ('user', 'group');
create type assignment_status as enum ('assigned', 'in_progress', 'completed', 'skipped');

-- ============================================================
-- PROFILI (estende auth.users)
-- ============================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text,
  role user_role not null default 'player',
  elo_estimate int,                       -- stima rating, popolata dal diagnostico (prompt 07)
  current_level int not null default 0,   -- livello nel percorso guidato
  onboarding_completed boolean not null default false,
  locale text not null default 'it',
  theme_preference text default 'dark',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- GRUPPI / CIRCOLI (Strato 1, predisposto ma non usato nell'MVP)
-- ============================================================
create table groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  type group_type not null default 'circolo',
  owner_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table group_members (
  group_id uuid not null references groups(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role_in_group group_member_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

-- ============================================================
-- CONTENUTI TEORICI (aperture / mediogioco / finali)
-- Albero: parent_id permette gerarchia (es. Siciliana -> Najdorf -> 6.Bg5)
-- ============================================================
create table content_items (
  id uuid primary key default gen_random_uuid(),
  type content_type not null,
  parent_id uuid references content_items(id) on delete cascade,
  eco_code text,                  -- es. 'B90' per aperture, null altrove
  title text not null,
  slug text unique not null,
  summary text,
  body jsonb,                     -- contenuto strutturato della lezione (riempito nei prompt 06)
  start_fen text,                 -- posizione di partenza
  line_pgn text,                  -- linea principale navigabile
  level int not null default 0,   -- difficoltà / livello del percorso
  order_index int not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================
-- PUZZLE TATTICI (dataset importato da Lichess nel prompt 05)
-- ============================================================
create table puzzles (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,        -- id del puzzle nel dataset Lichess
  fen text not null,
  moves text not null,            -- soluzione in UCI, spazio-separata
  rating int not null,
  themes text[] not null default '{}',
  popularity int default 0
);

-- ============================================================
-- TENTATIVI SU PUZZLE + STATO RIPETIZIONE SPAZIATA (SRS)
-- ============================================================
create table user_puzzle_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  puzzle_id uuid not null references puzzles(id) on delete cascade,
  success boolean not null,
  time_ms int,
  attempted_at timestamptz not null default now(),
  -- campi SRS
  ease numeric default 2.5,
  interval_days int default 0,
  due_at timestamptz
);
create index on user_puzzle_attempts (user_id, due_at);

-- ============================================================
-- PROGRESSI GRANULARI (cuore del coach AI e della dashboard istruttore)
-- Una riga per (utente, dimensione, chiave): es. tema tattico 'pin',
-- famiglia d'apertura 'sicilian', tipo di finale 'rook_endgame'
-- ============================================================
create table user_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  dimension text not null,        -- 'tactic_theme' | 'opening' | 'endgame' | 'middlegame_theme'
  key text not null,              -- es. 'fork', 'sicilian_najdorf', 'lucena'
  attempts int not null default 0,
  successes int not null default 0,
  score numeric not null default 0,   -- competenza stimata 0..1
  last_seen_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, dimension, key)
);
create index on user_progress (user_id, dimension);

-- ============================================================
-- REPERTORI DI APERTURE (utente o gruppo)
-- ============================================================
create table repertoires (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references profiles(id) on delete cascade,
  owner_group_id uuid references groups(id) on delete cascade,
  name text not null,
  color piece_color not null,
  created_at timestamptz not null default now(),
  check (
    (owner_user_id is not null and owner_group_id is null) or
    (owner_user_id is null and owner_group_id is not null)
  )
);

create table repertoire_moves (
  id uuid primary key default gen_random_uuid(),
  repertoire_id uuid not null references repertoires(id) on delete cascade,
  parent_move_id uuid references repertoire_moves(id) on delete cascade,
  ply int not null,
  san text not null,
  fen text not null,
  annotation text,
  eval numeric
);
create index on repertoire_moves (repertoire_id);

-- ============================================================
-- PARTITE IMPORTATE DELL'UTENTE
-- ============================================================
create table games (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  source game_source not null,
  external_id text,
  pgn text not null,
  white text,
  black text,
  result text,                    -- '1-0' | '0-1' | '1/2-1/2'
  eco_code text,
  user_color piece_color,
  played_at timestamptz,
  analyzed boolean not null default false,
  created_at timestamptz not null default now()
);
create index on games (user_id, created_at desc);

-- ============================================================
-- ANALISI PARTITA (una riga per semimossa, riempita nei prompt 03/04)
-- ============================================================
create table game_analysis (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  ply int not null,
  san text not null,
  fen text not null,
  eval_before numeric,
  eval_after numeric,
  best_move_san text,
  classification move_classification,
  ai_comment text,                -- spiegazione in italiano del coach (prompt 04)
  created_at timestamptz not null default now(),
  unique (game_id, ply)
);

-- ============================================================
-- ASSEGNAZIONI (Strato 1 — predisposto, l'algoritmo può già usarlo per il singolo)
-- ============================================================
create table assignments (
  id uuid primary key default gen_random_uuid(),
  assigned_by uuid references profiles(id) on delete set null,
  target_type assignment_target not null,
  target_user_id uuid references profiles(id) on delete cascade,
  target_group_id uuid references groups(id) on delete cascade,
  content_item_id uuid references content_items(id) on delete cascade,
  note text,
  due_at timestamptz,
  status assignment_status not null default 'assigned',
  created_at timestamptz not null default now()
);
```

### Trigger / funzioni

- Trigger `on auth.users insert` → crea automaticamente una riga `profiles` con `id` e `display_name` dai metadati.
- Trigger `updated_at` su `profiles` e `user_progress`.

### Row Level Security (attiva su TUTTE le tabelle con dati utente)

Policy minime da creare:
- `profiles`: ognuno legge/aggiorna solo la propria riga; gli `instructor` possono leggere i profili dei membri dei gruppi che possiedono.
- `games`, `game_analysis`, `user_puzzle_attempts`, `user_progress`: l'utente accede solo ai propri dati. Un istruttore può **leggere** (non scrivere) i dati dei membri dei gruppi che possiede.
- `repertoires` / `repertoire_moves`: accesso al proprietario (utente) o ai membri del gruppo proprietario.
- `groups` / `group_members`: il proprietario gestisce; i membri leggono il proprio gruppo.
- `assignments`: il `target_user` legge le proprie; chi assegna gestisce le sue.
- `content_items`, `puzzles`: lettura pubblica per le righe `published` / tutte (sono contenuti, non dati personali); scrittura solo `admin`/`instructor`.

Documenta ogni policy con un commento. Se una policy "istruttore legge i membri" è complessa, isolala in una funzione `is_group_instructor_of(target_user uuid)` `security definer`.

---

## 7. Autenticazione

- Supabase Auth con email/password + magic link.
- Pagine: `/login`, `/signup`, `/auth/callback`, `/reset-password`.
- Client Supabase configurati per App Router con `@supabase/ssr` (server client, browser client, middleware per refresh sessione).
- `middleware.ts` che protegge le route dell'app (tutto sotto `/app`) e fa il refresh del token.
- Dopo signup, se `onboarding_completed = false`, redirect a `/app/onboarding` (pagina placeholder per ora: la riempie il prompt 07).

---

## 8. Struttura cartelle e shell dell'app

```
src/
  app/
    (marketing)/
      page.tsx              # landing placeholder (la rifà il prompt 10)
    (auth)/
      login/ signup/ reset-password/
    app/
      layout.tsx            # shell autenticata: sidebar + topbar
      page.tsx              # dashboard placeholder ("Benvenuto")
      onboarding/page.tsx   # placeholder
    auth/callback/route.ts
    layout.tsx              # root: provider tema, font, Lenis
  components/
    ui/                     # primitivi (§5)
    layout/                 # Sidebar, Topbar, AppShell
  config/                   # brand.ts, site.ts
  lib/
    supabase/               # server.ts, client.ts, middleware.ts
    utils.ts                # cn(), helpers
  styles/                   # globals.css con le CSS variables
supabase/
  migrations/
```

Shell autenticata (`/app`): sidebar con le voci di navigazione **già presenti ma molte disabilitate** con badge "presto", così la struttura è visibile:
`Dashboard` · `Le mie partite` · `Tattiche` · `Teoria` · `Percorso` · `Coach` · `Profilo`.
Topbar con `ThemeToggle`, avatar utente, logout.

La pagina `/app` mostra un saluto col `display_name` e un layout pulito a card vuote — è solo lo scheletro.

---

## 9. Qualità e vincoli

- TypeScript strict, nessun `any` non giustificato.
- Accessibilità: focus visibili, contrasto AA, label sui form, navigazione da tastiera nei primitivi (Dialog, Tabs, Tooltip).
- Nessuna chiamata a font/risorse di terze parti dal client (GDPR): font self-hosted.
- Nessun dato finto persistito: niente seed di partite/puzzle in questo prompt.
- Commenta lo schema SQL e le policy RLS.
- Il progetto deve compilare (`next build`) ed eseguire senza errori, con la migration applicabile su un progetto Supabase pulito.

---

## 10. Deliverable di questo prompt

1. Progetto Next.js 15 che builda e gira.
2. Design system completo (CSS variables, temi chiaro/scuro, tipografia self-hosted, primitivi UI).
3. Migration SQL completa con tutte le tabelle, enum, trigger e policy RLS, applicabile da zero.
4. Autenticazione funzionante (signup/login/logout/reset, sessione persistente).
5. Shell autenticata con sidebar/topbar e navigazione a placeholder.
6. `.env.example`, `.gitignore` corretti.

**Quando hai finito, fermati.** Non iniziare la scacchiera: è il prompt `01`.
