-- ============================================================
-- Shakh — Prompt 08: Dashboard dei progressi (dati di sola visualizzazione)
-- La dashboard LEGGE e AGGREGA i progressi prodotti dagli altri moduli.
-- Qui si aggiungono solo due log di visualizzazione, non fonti di progresso:
--  1) storico del rating tattico (per il grafico d'andamento);
--  2) cache dell'ultima sintesi del coach (Funzione C, 04) per mostrarla
--     senza rigenerarla — non è una fonte di verità, solo l'ultimo risultato.
-- ============================================================

-- ------------------------------------------------------------
-- Storico del rating tattico
-- ------------------------------------------------------------
create table tactic_rating_history (
  id bigserial primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  rating int not null,
  recorded_at timestamptz not null default now()
);
create index on tactic_rating_history (user_id, recorded_at);

-- Ad ogni cambio di rating in user_tactic_stats, logga uno snapshot.
create or replace function public.log_tactic_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.rating is distinct from old.rating) then
    insert into tactic_rating_history (user_id, rating) values (new.user_id, new.rating);
  end if;
  return new;
end;
$$;

create trigger trg_log_tactic_rating
  after update on user_tactic_stats
  for each row execute function public.log_tactic_rating();

-- ------------------------------------------------------------
-- Cache dell'ultima sintesi del coach (una riga per utente)
-- ------------------------------------------------------------
create table coach_synthesis (
  user_id uuid primary key references profiles(id) on delete cascade,
  summary text not null,
  focus_areas text[] not null default '{}',
  suggestion text,
  updated_at timestamptz not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY (sola lettura/scrittura dei propri dati;
-- istruttore in lettura, predisposto per il 09)
-- ============================================================
alter table tactic_rating_history enable row level security;
alter table coach_synthesis        enable row level security;

create policy trh_select on tactic_rating_history
  for select using (
    user_id = auth.uid() or public.is_group_instructor_of(user_id)
  );
create policy trh_write_own on tactic_rating_history
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy cs_select on coach_synthesis
  for select using (
    user_id = auth.uid() or public.is_group_instructor_of(user_id)
  );
create policy cs_write_own on coach_synthesis
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
