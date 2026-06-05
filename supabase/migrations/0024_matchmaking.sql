-- ============================================================
-- Shakh — Matchmaking online (Gioca contro avversari di tutto il mondo)
-- Un giocatore loggato entra in coda; quando un altro giocatore loggato entra
-- in coda con lo STESSO controllo di tempo e un rating compatibile (banda che
-- si allarga con l'attesa), i due vengono accoppiati: si crea una riga
-- `friend_games` GIA' `ongoing` con entrambi assegnati. Da lì in poi la partita
-- riusa interamente l'infrastruttura `friend_games` (mosse/orologio/Realtime).
--
-- L'accoppiamento (tocca due righe di utenti diversi) passa da una funzione
-- SECURITY DEFINER con `for update skip locked` → niente race, niente service role.
-- Le partite da matchmaking sono `rated`: a fine partita OGNI giocatore applica
-- da sé il proprio aggiornamento di rating (RLS-safe), usando lo snapshot del
-- rating avversario fissato qui all'accoppiamento.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Campi "rated" + snapshot rating sulle partite
-- ------------------------------------------------------------
alter table friend_games
  add column if not exists rated boolean not null default false,
  add column if not exists white_rating numeric,
  add column if not exists white_rd numeric,
  add column if not exists black_rating numeric,
  add column if not exists black_rd numeric,
  add column if not exists white_rated_at timestamptz,
  add column if not exists black_rated_at timestamptz;

-- ------------------------------------------------------------
-- 2) Coda di matchmaking (una riga per utente in cerca)
-- ------------------------------------------------------------
create table if not exists matchmaking_queue (
  user_id uuid primary key references profiles(id) on delete cascade,
  display_name text,
  time_control_id text not null,             -- es. "3+2" (vedi TIME_CONTROLS)
  initial_ms integer,                        -- null = senza orologio
  increment_ms integer not null default 0,
  rating numeric not null,                   -- snapshot rating complessivo (banding)
  rd numeric not null default 350,
  game_id uuid references friend_games(id) on delete set null,  -- valorizzato all'accoppiamento
  enqueued_at timestamptz not null default now()
);

create index if not exists matchmaking_queue_match_idx
  on matchmaking_queue (time_control_id, game_id, enqueued_at);

alter table matchmaking_queue enable row level security;

-- Ognuno vede e gestisce SOLO la propria riga (l'accoppiamento è in SECURITY DEFINER).
create policy mmq_select_own on matchmaking_queue for select
  using (user_id = auth.uid());
create policy mmq_write_own on matchmaking_queue for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Realtime: il client si sottoscrive alla PROPRIA riga per sapere quando game_id si valorizza.
alter publication supabase_realtime add table matchmaking_queue;
alter table matchmaking_queue replica identity full;

-- ------------------------------------------------------------
-- 3) mm_enqueue — accoppiamento atomico
-- Ritorna l'id della partita se accoppiato, NULL se si resta in attesa.
-- ------------------------------------------------------------
create or replace function public.mm_enqueue(
  p_tc text,
  p_initial_ms integer,
  p_inc_ms integer,
  p_rating numeric,
  p_rd numeric,
  p_band numeric
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  uname text;
  opp matchmaking_queue;
  mine matchmaking_queue;
  new_id uuid;
  i_am_white boolean;
  w_id uuid; b_id uuid;
  w_name text; b_name text;
  w_rating numeric; w_rd numeric; b_rating numeric; b_rd numeric;
begin
  if me is null then
    raise exception 'auth_required';
  end if;

  -- Già accoppiato mentre cercavo? Ritorna quella partita (se non è finita).
  select * into mine from matchmaking_queue where user_id = me;
  if mine.game_id is not null then
    if exists (select 1 from friend_games g where g.id = mine.game_id and g.status <> 'finished') then
      return mine.game_id;
    end if;
    -- riga stantia (partita finita): la rimuovo e proseguo come nuova ricerca
    delete from matchmaking_queue where user_id = me;
  end if;

  select display_name into uname from profiles where id = me;

  -- Cerca un avversario compatibile (FIFO entro la banda di rating).
  select * into opp
  from matchmaking_queue
  where user_id <> me
    and time_control_id = p_tc
    and game_id is null
    and abs(rating - p_rating) <= p_band
  order by enqueued_at
  limit 1
  for update skip locked;

  if opp.user_id is not null then
    -- Accoppiati! Colore casuale.
    i_am_white := (random() < 0.5);
    if i_am_white then
      w_id := me;        w_name := coalesce(uname, 'Giocatore');
      b_id := opp.user_id; b_name := coalesce(opp.display_name, 'Avversario');
      w_rating := p_rating; w_rd := p_rd; b_rating := opp.rating; b_rd := opp.rd;
    else
      w_id := opp.user_id; w_name := coalesce(opp.display_name, 'Avversario');
      b_id := me;          b_name := coalesce(uname, 'Giocatore');
      w_rating := opp.rating; w_rd := opp.rd; b_rating := p_rating; b_rd := p_rd;
    end if;

    insert into friend_games (
      turn, status, white_user_id, black_user_id, white_name, black_name,
      creator_color, initial_ms, increment_ms, white_ms, black_ms, last_move_at,
      rated, white_rating, white_rd, black_rating, black_rd
    ) values (
      'w', 'ongoing', w_id, b_id, w_name, b_name,
      'w', p_initial_ms, coalesce(p_inc_ms, 0), p_initial_ms, p_initial_ms, now(),
      true, w_rating, w_rd, b_rating, b_rd
    )
    returning id into new_id;

    -- Notifica entrambi i lati (Realtime su matchmaking_queue).
    update matchmaking_queue set game_id = new_id where user_id = opp.user_id;
    insert into matchmaking_queue (user_id, display_name, time_control_id, initial_ms, increment_ms, rating, rd, game_id)
      values (me, uname, p_tc, p_initial_ms, coalesce(p_inc_ms, 0), p_rating, p_rd, new_id)
      on conflict (user_id) do update set game_id = excluded.game_id;

    return new_id;
  end if;

  -- Nessun avversario: (re)inserisco me in coda in attesa.
  insert into matchmaking_queue (user_id, display_name, time_control_id, initial_ms, increment_ms, rating, rd, game_id, enqueued_at)
    values (me, uname, p_tc, p_initial_ms, coalesce(p_inc_ms, 0), p_rating, p_rd, null, now())
    on conflict (user_id) do update set
      display_name = excluded.display_name,
      time_control_id = excluded.time_control_id,
      initial_ms = excluded.initial_ms,
      increment_ms = excluded.increment_ms,
      rating = excluded.rating,
      rd = excluded.rd,
      game_id = null,
      enqueued_at = now();

  return null;
end;
$$;

revoke all on function public.mm_enqueue(text, integer, integer, numeric, numeric, numeric) from public;
grant execute on function public.mm_enqueue(text, integer, integer, numeric, numeric, numeric) to authenticated;

-- ------------------------------------------------------------
-- 4) mm_cancel — esci dalla coda
-- ------------------------------------------------------------
create or replace function public.mm_cancel()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'auth_required';
  end if;
  delete from matchmaking_queue where user_id = auth.uid();
end;
$$;

revoke all on function public.mm_cancel() from public;
grant execute on function public.mm_cancel() to authenticated;
