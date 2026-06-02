-- ============================================================
-- Shakh — Migration 0003: allenamento tattico (prompt 05)
-- Additiva: statistiche tattiche utente + indici per la selezione puzzle.
-- Applicabile su un DB con la 0001 (+ 0002) già applicate.
-- ============================================================

-- ------------------------------------------------------------
-- Rating / streak tattico del solver (una riga per utente).
-- Tenuta separata da `profiles` per non sporcare il profilo.
-- ------------------------------------------------------------
create table user_tactic_stats (
  user_id uuid primary key references profiles(id) on delete cascade,
  rating int not null default 1200,        -- rating tattico del solver
  rating_deviation int not null default 350,
  puzzles_solved int not null default 0,
  puzzles_failed int not null default 0,
  current_streak int not null default 0,
  best_streak int not null default 0,
  updated_at timestamptz not null default now()
);

create trigger user_tactic_stats_set_updated_at
  before update on user_tactic_stats
  for each row execute function public.set_updated_at();

alter table user_tactic_stats enable row level security;

-- L'utente accede solo alla propria riga; l'istruttore (owner del gruppo) in lettura.
create policy uts_select on user_tactic_stats
  for select using (
    user_id = auth.uid() or public.is_group_instructor_of(user_id)
  );
create policy uts_write_own on user_tactic_stats
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ------------------------------------------------------------
-- Indici per la selezione efficiente dei puzzle (niente full scan).
-- ------------------------------------------------------------
create index if not exists puzzles_rating_idx on puzzles (rating);
create index if not exists puzzles_themes_idx on puzzles using gin (themes);
-- Per escludere i puzzle già visti di recente e leggere lo stato SRS.
create index if not exists upa_user_puzzle_idx on user_puzzle_attempts (user_id, puzzle_id);
