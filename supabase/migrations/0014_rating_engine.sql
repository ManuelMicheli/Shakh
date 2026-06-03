-- ============================================================
-- Shakh — Motore di rating olistico "Rating Shakh"
-- Sostituisce l'Elo tattico ad-hoc con un sistema Glicko-2 multi-segnale,
-- calibrato sulla scala OTB (severo, anti-inflazione).
--
--  * user_ratings  — stato per-dominio (μ/φ/σ su scala Elo) + riga 'overall'
--  * rating_events — log di audit di ogni variazione
--
-- user_tactic_stats resta intatto: il motore vi rispecchia il sotto-rating
-- 'tactic' per non rompere dashboard e grafico storico (trg_log_tactic_rating).
-- ============================================================

-- ------------------------------------------------------------
-- Stato di rating per dominio
-- ------------------------------------------------------------
create table user_ratings (
  user_id uuid not null references profiles(id) on delete cascade,
  -- 'tactic' | 'games' | 'endgame' | 'calculation' | 'play_quality' | 'overall'
  domain text not null,
  rating numeric not null,
  rd numeric not null default 350,
  vol numeric not null default 0.06,
  samples int not null default 0,
  provisional boolean not null default true,
  ceiling numeric,                     -- significativo solo sulla riga 'overall'
  updated_at timestamptz not null default now(),
  primary key (user_id, domain)
);

create trigger user_ratings_set_updated_at
  before update on user_ratings
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- Log di audit delle variazioni di rating
-- ------------------------------------------------------------
create table rating_events (
  id bigserial primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  domain text not null,
  delta numeric not null,              -- variazione applicata al rating del dominio
  reason text,                         -- 'puzzle' | 'game_batch' | 'endgame' | 'calculation'
  meta jsonb,                          -- forza avversario, score, game_id, ...
  recorded_at timestamptz not null default now()
);
create index on rating_events (user_id, recorded_at);

-- ============================================================
-- ROW LEVEL SECURITY (propri dati; istruttore in lettura)
-- ============================================================
alter table user_ratings  enable row level security;
alter table rating_events enable row level security;

create policy ur_select on user_ratings
  for select using (
    user_id = auth.uid() or public.is_group_instructor_of(user_id)
  );
create policy ur_write_own on user_ratings
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy re_select on rating_events
  for select using (
    user_id = auth.uid() or public.is_group_instructor_of(user_id)
  );
create policy re_write_own on rating_events
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================
-- BACKFILL (idempotente)
-- Semina il sotto-rating 'tactic' e la riga 'overall' dagli stat esistenti.
-- L'Elo storico (gonfiato, partito da 1200) è solo una stima di partenza:
-- con RD ≥ 150 il motore lo ricalibra in fretta. I tentativi storici NON
-- vengono rigiocati (troppo costoso): la calibrazione converge in avanti.
-- ============================================================
insert into user_ratings (user_id, domain, rating, rd, vol, samples, provisional)
select
  s.user_id,
  'tactic',
  s.rating,
  greatest(s.rating_deviation, 150),
  0.06,
  (s.puzzles_solved + s.puzzles_failed),
  true
from user_tactic_stats s
on conflict (user_id, domain) do nothing;

insert into user_ratings (user_id, domain, rating, rd, vol, samples, provisional, ceiling)
select
  s.user_id,
  'overall',
  s.rating,
  greatest(s.rating_deviation, 150),
  0.06,
  (s.puzzles_solved + s.puzzles_failed),
  true,
  null
from user_tactic_stats s
on conflict (user_id, domain) do nothing;
