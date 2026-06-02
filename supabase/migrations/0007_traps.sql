-- 0007_traps.sql
-- Prompt 06d — Trappole, sacrifici e astuzie.
-- Modello dati dedicato alle trappole (metadati propri: chi la tende, l'esca, la
-- punizione, quanto è famosa) che però riusa il formato `Lesson` del 06a nel
-- campo `body` (jsonb) per il rendering, e una tabella SRS per-utente isolata.

-- Enum dedicati (guardie idempotenti: la migration resta rieseguibile a freddo).
do $$ begin
  create type trap_category as enum ('opening_trap', 'gambit', 'sacrifice', 'swindle', 'tactical_motif');
exception when duplicate_object then null; end $$;

do $$ begin
  create type trap_fame as enum ('famous', 'known', 'niche', 'obscure');
exception when duplicate_object then null; end $$;

do $$ begin
  create type trap_side as enum ('white', 'black');
exception when duplicate_object then null; end $$;

create table if not exists traps (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,                 -- es. "Matto di Légal", "Fegato Fritto"
  category trap_category not null,
  fame trap_fame not null default 'known',
  eco_code text,                      -- apertura associata, nullable
  opening_name text,                  -- es. "Difesa Philidor"
  side trap_side not null,            -- chi TENDE la trappola
  motif text[] not null default '{}', -- temi tattici: 'fork','pin','smotheredMate','sacrifice'...
  level int not null default 0,       -- difficoltà
  trigger_fen text not null,          -- posizione chiave (poco prima dell'esca)
  line_pgn text not null,             -- linea: esca + punizione (validata con chess.js)
  body jsonb not null,                -- formato Lesson (06a): passi, frecce, varianti
  published boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists traps_category_idx on traps (category);
create index if not exists traps_eco_idx on traps (eco_code);
create index if not exists traps_motif_idx on traps using gin (motif);

-- Progresso/SRS per-utente sulle trappole (tipo SM-2, isolato dal resto).
create table if not exists user_trap_progress (
  user_id uuid not null references profiles(id) on delete cascade,
  trap_id uuid not null references traps(id) on delete cascade,
  seen boolean not null default false,
  attempts int not null default 0,
  successes int not null default 0,
  ease numeric not null default 2.5,
  interval_days int not null default 0,
  due_at timestamptz,
  primary key (user_id, trap_id)
);
create index if not exists user_trap_progress_due_idx on user_trap_progress (user_id, due_at);

-- ------------------------------------------------------------
-- RLS
-- traps: contenuti, non dati personali. Lettura pubblica dei `published`;
-- scrittura solo admin/instructor (mirror di content_items).
-- ------------------------------------------------------------
alter table traps enable row level security;

drop policy if exists traps_select_published on traps;
create policy traps_select_published on traps
  for select using (
    published = true
    or exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role in ('admin', 'instructor')
    )
  );

drop policy if exists traps_staff_write on traps;
create policy traps_staff_write on traps
  for all using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role in ('admin', 'instructor')
    )
  ) with check (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role in ('admin', 'instructor')
    )
  );

-- ------------------------------------------------------------
-- user_trap_progress: l'utente accede solo ai propri dati; l'istruttore può
-- LEGGERE i dati dei membri dei suoi gruppi (mirror di user_puzzle_attempts).
-- ------------------------------------------------------------
alter table user_trap_progress enable row level security;

drop policy if exists utp_select on user_trap_progress;
create policy utp_select on user_trap_progress
  for select using (
    user_id = auth.uid() or public.is_group_instructor_of(user_id)
  );

drop policy if exists utp_write_own on user_trap_progress;
create policy utp_write_own on user_trap_progress
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
