-- ============================================================
-- Shakh — Account online collegati (Lichess / Chess.com)
-- Alimentano il dominio 'external' del Rating Shakh: il rating della
-- piattaforma esterna, deflazionato a Elo OTB, pesa MOLTO nell'aggregato
-- (src/lib/rating/aggregate.ts → DOMAIN_PRIOR.external).
--
-- Un solo account per piattaforma per utente. I dati sono PUBBLICI lato
-- piattaforma; qui memorizziamo username + l'ultima lettura del rating.
-- ============================================================

create table external_accounts (
  user_id uuid not null references profiles(id) on delete cascade,
  source text not null check (source in ('lichess', 'chesscom')),
  username text not null,
  -- Rating rappresentativo nella scala NATIVA della piattaforma.
  rating_native numeric,
  -- Rating deflazionato a Elo OTB (quello dato in pasto al motore).
  rating_otb numeric,
  -- Partite valutate dietro alla stima (confidenza → RD del dominio external).
  n_games int not null default 0,
  -- Dettaglio per controllo di tempo (rapid/blitz/…), come letto dall'API.
  controls jsonb,
  -- Verifica di proprietà dell'account (futuro: token nel profilo). Per ora false.
  verified boolean not null default false,
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (user_id, source)
);

create index on external_accounts (user_id);

-- ============================================================
-- ROW LEVEL SECURITY (propri dati; istruttore in lettura)
-- ============================================================
alter table external_accounts enable row level security;

create policy ext_select on external_accounts
  for select using (
    user_id = auth.uid() or public.is_group_instructor_of(user_id)
  );
create policy ext_write_own on external_accounts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
