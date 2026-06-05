-- ============================================================
-- Shakh — La Lega & Il Campionato
--
-- LA LEGA non ha tabelle: è una funzione pura del Rating Shakh (`user_ratings`
-- dominio 'overall'), calcolata in app (`src/lib/lega/divisions.ts`). Sei
-- divisioni a tema pezzi (Pedone..Re) con bande di rating contigue.
--
-- IL CAMPIONATO è la competizione attiva, gating per divisione Lega:
--   • Stagione (mensile, a rotazione automatica) → gironi da 8 per divisione.
--   • Round-robin "a richiesta": entri nella coda dedicata, il sistema ti
--     accoppia con un compagno di girone non ancora affrontato. In stagione
--     completi le 7 partite. Ogni coppia gioca esattamente una volta.
--   • Punteggio scacchistico 1 / ½ / 0 in classifica di girone.
--   • Le partite sono `rated` e riusano interamente `friend_games`.
--   • A fine stagione: spareggio di promozione (1° +1 divisione, ultimo −1) e
--     penalità forfait (dal 3° forfait in poi, −1 punto ciascuno).
--
-- Come per il matchmaking (0024), l'accoppiamento (tocca righe di utenti
-- diversi) passa da funzioni SECURITY DEFINER con `for update skip locked`.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Stagioni — finestre temporali globali a rotazione
-- ------------------------------------------------------------
create table if not exists championship_seasons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,                 -- es. '2026-06' (mese)
  label text,                                -- es. 'Giugno 2026'
  status text not null default 'active'
    check (status in ('open', 'active', 'closed')),
  time_control_id text not null default '10+5',  -- controllo standard del Campionato
  starts_at timestamptz not null default now(),
  ends_at timestamptz,                       -- chiusura prevista
  created_at timestamptz not null default now()
);

create index if not exists champ_seasons_status_idx
  on championship_seasons (status, ends_at);

alter table championship_seasons enable row level security;
-- Contenuto pubblico in lettura (classifiche/stagioni visibili a tutti i loggati).
create policy champ_seasons_read on championship_seasons for select
  using (auth.role() = 'authenticated');

-- ------------------------------------------------------------
-- 2) Gironi — gruppi da 8, uno per (stagione, divisione, indice)
-- ------------------------------------------------------------
create table if not exists championship_groups (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references championship_seasons(id) on delete cascade,
  division text not null,                    -- DivisionKey: pedone..re
  idx int not null,                          -- 0,1,2,... gironi paralleli della divisione
  label text,                                -- es. 'Alfiere · Girone B'
  created_at timestamptz not null default now(),
  unique (season_id, division, idx)
);

create index if not exists champ_groups_season_div_idx
  on championship_groups (season_id, division);

alter table championship_groups enable row level security;
create policy champ_groups_read on championship_groups for select
  using (auth.role() = 'authenticated');

-- ------------------------------------------------------------
-- 3) Iscritti — una riga per (girone, utente). Classifica vive qui.
-- season_id denormalizzato per il vincolo "un solo girone per stagione".
-- ------------------------------------------------------------
create table if not exists championship_members (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references championship_seasons(id) on delete cascade,
  -- NULL durante 'open' (iscritto in attesa): il girone è assegnato dal seeding
  -- bilanciato per rating quando la stagione passa ad 'active'.
  group_id uuid references championship_groups(id) on delete set null,
  division text not null,
  user_id uuid not null references profiles(id) on delete cascade,
  display_name text,
  seed_rating numeric not null,              -- rating all'iscrizione (spareggio/seed)
  points numeric not null default 0,         -- punti da partite giocate (1/½/0)
  played int not null default 0,
  wins int not null default 0,
  draws int not null default 0,
  losses int not null default 0,
  whites int not null default 0,             -- partite col bianco (bilanciamento colore)
  blacks int not null default 0,             -- partite col nero
  last_color char(1),                        -- ultimo colore assegnato ('w'/'b'), anti-streak
  forfeits int not null default 0,           -- partite non disputate a fine stagione
  penalty numeric not null default 0,        -- penalità forfait applicata alla chiusura
  final_rank int,                            -- posizione finale (valorizzata alla chiusura)
  rank_shift int,                            -- -1/0/+1 spareggio promozione applicato
  joined_at timestamptz not null default now(),
  unique (season_id, user_id),
  unique (group_id, user_id)
);

create index if not exists champ_members_group_idx
  on championship_members (group_id);
create index if not exists champ_members_user_idx
  on championship_members (user_id, season_id);

alter table championship_members enable row level security;
-- Classifiche pubbliche in lettura; scrittura solo via funzioni SECURITY DEFINER.
create policy champ_members_read on championship_members for select
  using (auth.role() = 'authenticated');

-- ------------------------------------------------------------
-- 4) Partite di campionato — pairing di girone legato a una `friend_games`.
-- pair_lo/pair_hi = coppia non ordinata → unicità "ogni coppia gioca una volta".
-- ------------------------------------------------------------
create table if not exists championship_games (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references championship_seasons(id) on delete cascade,
  group_id uuid not null references championship_groups(id) on delete cascade,
  friend_game_id uuid references friend_games(id) on delete set null,
  white_user_id uuid not null references profiles(id) on delete cascade,
  black_user_id uuid not null references profiles(id) on delete cascade,
  pair_lo uuid not null,
  pair_hi uuid not null,
  status text not null default 'ongoing'
    check (status in ('ongoing', 'finished')),
  result text,                               -- '1-0' | '0-1' | '1/2-1/2'
  scored boolean not null default false,     -- guardia idempotenza punteggio
  created_at timestamptz not null default now(),
  unique (group_id, pair_lo, pair_hi)
);

create index if not exists champ_games_group_idx
  on championship_games (group_id, status);
create index if not exists champ_games_friend_idx
  on championship_games (friend_game_id);

alter table championship_games enable row level security;
create policy champ_games_read on championship_games for select
  using (auth.role() = 'authenticated');

-- ------------------------------------------------------------
-- 5) Coda dedicata del Campionato (una riga per utente in cerca).
-- ------------------------------------------------------------
create table if not exists championship_queue (
  user_id uuid primary key references profiles(id) on delete cascade,
  group_id uuid not null references championship_groups(id) on delete cascade,
  season_id uuid not null references championship_seasons(id) on delete cascade,
  display_name text,
  seed_rating numeric not null,
  game_id uuid references friend_games(id) on delete set null,  -- valorizzato all'accoppiamento
  enqueued_at timestamptz not null default now()
);

create index if not exists champ_queue_group_idx
  on championship_queue (group_id, game_id, enqueued_at);

alter table championship_queue enable row level security;
create policy champ_queue_own on championship_queue for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Realtime: il client osserva la propria riga per sapere quando game_id appare.
alter publication supabase_realtime add table championship_queue;
alter table championship_queue replica identity full;

-- ============================================================
-- FUNZIONI
-- ============================================================

-- ------------------------------------------------------------
-- champ_enroll — iscrive il chiamante alla stagione corrente nella sua divisione
-- (derivata in app dal rating Shakh). Idempotente (un'iscrizione per stagione).
--   • stagione 'open': iscritto SENZA girone (group_id null). I gironi si
--     formano col seeding bilanciato per rating (`champ_seed_season`) all'avvio.
--   • stagione 'active' (iscrizione tardiva): riempimento lazy nel primo girone
--     della divisione con meno di 8, altrimenti nuovo girone.
-- Ritorna il group_id (null se in attesa di seeding).
-- ------------------------------------------------------------
create or replace function public.champ_enroll(
  p_division text,
  p_seed_rating numeric
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  uname text;
  s_id uuid;
  s_status text;
  g_id uuid;
  existing championship_members;
  next_idx int;
  div_label text;
begin
  if me is null then
    raise exception 'auth_required';
  end if;

  -- Stagione corrente (aperta o attiva).
  select id, status into s_id, s_status
  from championship_seasons
  where status in ('open', 'active')
  order by starts_at desc
  limit 1;
  if s_id is null then
    raise exception 'no_active_season';
  end if;

  -- Già iscritto in questa stagione?
  select * into existing
  from championship_members
  where season_id = s_id and user_id = me;
  if existing.id is not null then
    return existing.group_id;
  end if;

  select display_name into uname from profiles where id = me;

  -- 'open': iscrizione in attesa, girone assegnato dal seeding bilanciato.
  if s_status = 'open' then
    insert into championship_members
      (season_id, group_id, division, user_id, display_name, seed_rating)
      values (s_id, null, p_division, me, coalesce(uname, 'Giocatore'), p_seed_rating)
      on conflict (season_id, user_id) do nothing;
    return null;
  end if;

  -- 'active' (iscrizione tardiva): riempimento lazy.
  select cg.id into g_id
  from championship_groups cg
  where cg.season_id = s_id and cg.division = p_division
    and (select count(*) from championship_members m where m.group_id = cg.id) < 8
  order by cg.idx
  limit 1
  for update of cg skip locked;

  if g_id is null then
    select coalesce(max(idx) + 1, 0) into next_idx
    from championship_groups
    where season_id = s_id and division = p_division;
    div_label := initcap(p_division) || ' · Girone ' || chr(65 + next_idx);
    insert into championship_groups (season_id, division, idx, label)
      values (s_id, p_division, next_idx, div_label)
      returning id into g_id;
  end if;

  insert into championship_members
    (season_id, group_id, division, user_id, display_name, seed_rating)
    values (s_id, g_id, p_division, me, coalesce(uname, 'Giocatore'), p_seed_rating)
    on conflict (season_id, user_id) do nothing;

  return g_id;
end;
$$;

revoke all on function public.champ_enroll(text, numeric) from public;
grant execute on function public.champ_enroll(text, numeric) to authenticated;

-- ------------------------------------------------------------
-- champ_seed_season — forma i gironi BILANCIATI per rating e attiva la stagione.
-- Per ogni divisione con iscritti in attesa (group_id null):
--   • k = ceil(n / 8) gironi (taglie ≤ 8, il più uniformi possibile);
--   • distribuzione a serpentina (snake draft) sugli iscritti ordinati per
--     rating: girone 0,1,..,k-1, k-1,..,1,0, 0,1,.. → ogni girone riceve un mix
--     uniforme di teste di serie e code, medie di forza vicine tra i gironi.
-- Solo admin/cron (nessun grant ad authenticated). Da invocare una volta a
-- fine finestra iscrizioni.
-- ------------------------------------------------------------
create or replace function public.champ_seed_season(p_season_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  divk text;
  n int; k int; i int; cyc int; within int; gi int;
  grp_ids uuid[];
  new_gid uuid;
  m record;
begin
  -- Solo stagioni aperte: evita doppi seeding.
  if not exists (select 1 from championship_seasons where id = p_season_id and status = 'open') then
    return;
  end if;

  for divk in
    select distinct division from championship_members
    where season_id = p_season_id and group_id is null
  loop
    select count(*) into n from championship_members
    where season_id = p_season_id and division = divk and group_id is null;
    k := greatest(1, ceil(n::numeric / 8)::int);

    -- Crea k gironi e raccogline gli id in ordine di indice.
    grp_ids := array[]::uuid[];
    for gi in 0 .. k - 1 loop
      insert into championship_groups (season_id, division, idx, label)
        values (p_season_id, divk, gi, initcap(divk) || ' · Girone ' || chr(65 + gi))
        returning id into new_gid;
      grp_ids := array_append(grp_ids, new_gid);
    end loop;

    -- Snake draft sugli iscritti ordinati per rating (forte → debole).
    i := 0;
    for m in
      select id from championship_members
      where season_id = p_season_id and division = divk and group_id is null
      order by seed_rating desc, joined_at asc
    loop
      cyc := i / k;          -- divisione intera
      within := i % k;
      if cyc % 2 = 0 then gi := within; else gi := k - 1 - within; end if;
      update championship_members set group_id = grp_ids[gi + 1] where id = m.id;
      i := i + 1;
    end loop;
  end loop;

  update championship_seasons set status = 'active' where id = p_season_id;
end;
$$;

revoke all on function public.champ_seed_season(uuid) from public;
revoke execute on function public.champ_seed_season(uuid) from anon, authenticated;

-- ------------------------------------------------------------
-- champ_enqueue — coda dedicata: accoppia con un compagno di girone NON ancora
-- affrontato in stagione. Crea `friend_games` (rated) + `championship_games`.
-- Ritorna il game_id se accoppiato, NULL se resta in attesa.
-- ------------------------------------------------------------
create or replace function public.champ_enqueue()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  my championship_members;
  opp_m championship_members;
  s_id uuid;
  tc_id text;
  i_initial int;
  i_inc int;
  mine championship_queue;
  opp championship_queue;
  new_id uuid;
  cg_id uuid;
  i_am_white boolean;
  d_me int; d_opp int;       -- squilibrio colore (bianchi − neri)
  w_id uuid; b_id uuid; w_name text; b_name text;
  w_rating numeric; b_rating numeric;
  lo uuid; hi uuid;
begin
  if me is null then
    raise exception 'auth_required';
  end if;

  -- Devo essere iscritto a un girone della stagione attiva.
  select m.* into my
  from championship_members m
  join championship_seasons s on s.id = m.season_id
  where m.user_id = me and s.status = 'active'
  order by m.joined_at desc
  limit 1;
  if my.id is null then
    raise exception 'not_enrolled';
  end if;
  if my.group_id is null then
    raise exception 'not_seeded';  -- gironi non ancora formati
  end if;
  s_id := my.season_id;
  cg_id := my.group_id;

  -- Controllo di tempo dalla stagione.
  select time_control_id into tc_id from championship_seasons where id = s_id;

  -- Già accoppiato mentre cercavo? Ritorna quella partita se non finita.
  select * into mine from championship_queue where user_id = me;
  if mine.game_id is not null then
    if exists (select 1 from friend_games g where g.id = mine.game_id and g.status <> 'finished') then
      return mine.game_id;
    end if;
    delete from championship_queue where user_id = me;
  end if;

  -- Cerca un compagno di girone in coda, NON ancora affrontato in stagione.
  select q.* into opp
  from championship_queue q
  where q.group_id = cg_id
    and q.user_id <> me
    and q.game_id is null
    and not exists (
      select 1 from championship_games cgx
      where cgx.group_id = cg_id
        and cgx.pair_lo = least(me, q.user_id)
        and cgx.pair_hi = greatest(me, q.user_id)
    )
  order by q.enqueued_at
  limit 1
  for update skip locked;

  if opp.user_id is not null then
    -- Risolvi il controllo di tempo in ms.
    i_initial := case tc_id
      when '10+5' then 600000 when '10+0' then 600000 when '15+10' then 900000
      when '5+3' then 300000 when '5+0' then 300000 when '30+0' then 1800000
      when '3+2' then 180000 when '3+0' then 180000
      else 600000 end;
    i_inc := case tc_id
      when '10+5' then 5000 when '15+10' then 10000 when '5+3' then 3000
      when '3+2' then 2000 else 0 end;

    -- Colore bilanciato: il bianco va a chi ha lo squilibrio (bianchi − neri)
    -- più basso, cioè a chi "deve" più bianchi. Pareggio → a chi NON ha appena
    -- giocato il bianco (anti-streak); se ancora pari, caso.
    select * into opp_m
    from championship_members where group_id = cg_id and user_id = opp.user_id;
    d_me := my.whites - my.blacks;
    d_opp := coalesce(opp_m.whites - opp_m.blacks, 0);
    if d_me < d_opp then
      i_am_white := true;
    elsif d_me > d_opp then
      i_am_white := false;
    elsif my.last_color = 'w' and coalesce(opp_m.last_color, 'b') <> 'w' then
      i_am_white := false;
    elsif coalesce(opp_m.last_color, 'b') = 'w' and my.last_color <> 'w' then
      i_am_white := true;
    else
      i_am_white := (random() < 0.5);
    end if;

    if i_am_white then
      w_id := me; w_name := coalesce(my.display_name, 'Giocatore');
      b_id := opp.user_id; b_name := coalesce(opp.display_name, 'Avversario');
      w_rating := my.seed_rating; b_rating := opp.seed_rating;
    else
      w_id := opp.user_id; w_name := coalesce(opp.display_name, 'Avversario');
      b_id := me; b_name := coalesce(my.display_name, 'Giocatore');
      w_rating := opp.seed_rating; b_rating := my.seed_rating;
    end if;

    insert into friend_games (
      turn, status, white_user_id, black_user_id, white_name, black_name,
      creator_color, initial_ms, increment_ms, white_ms, black_ms, last_move_at,
      rated, white_rating, white_rd, black_rating, black_rd
    ) values (
      'w', 'ongoing', w_id, b_id, w_name, b_name,
      'w', i_initial, i_inc, i_initial, i_initial, now(),
      true, w_rating, 80, b_rating, 80
    )
    returning id into new_id;

    lo := least(me, opp.user_id);
    hi := greatest(me, opp.user_id);
    insert into championship_games
      (season_id, group_id, friend_game_id, white_user_id, black_user_id, pair_lo, pair_hi)
      values (s_id, cg_id, new_id, w_id, b_id, lo, hi);

    -- Aggiorna i contatori colore (decisi qui, indipendenti dall'esito).
    update championship_members set whites = whites + 1, last_color = 'w'
      where group_id = cg_id and user_id = w_id;
    update championship_members set blacks = blacks + 1, last_color = 'b'
      where group_id = cg_id and user_id = b_id;

    -- Notifica entrambi (Realtime sulla coda).
    update championship_queue set game_id = new_id where user_id = opp.user_id;
    insert into championship_queue (user_id, group_id, season_id, display_name, seed_rating, game_id)
      values (me, cg_id, s_id, my.display_name, my.seed_rating, new_id)
      on conflict (user_id) do update set game_id = excluded.game_id;

    return new_id;
  end if;

  -- Nessun avversario: (re)inserisco me in coda.
  insert into championship_queue (user_id, group_id, season_id, display_name, seed_rating, game_id, enqueued_at)
    values (me, cg_id, s_id, my.display_name, my.seed_rating, null, now())
    on conflict (user_id) do update set
      group_id = excluded.group_id,
      season_id = excluded.season_id,
      display_name = excluded.display_name,
      seed_rating = excluded.seed_rating,
      game_id = null,
      enqueued_at = now();

  return null;
end;
$$;

revoke all on function public.champ_enqueue() from public;
grant execute on function public.champ_enqueue() to authenticated;

-- ------------------------------------------------------------
-- champ_cancel — esci dalla coda del Campionato.
-- ------------------------------------------------------------
create or replace function public.champ_cancel()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'auth_required';
  end if;
  delete from championship_queue where user_id = auth.uid();
end;
$$;

revoke all on function public.champ_cancel() from public;
grant execute on function public.champ_cancel() to authenticated;

-- ------------------------------------------------------------
-- champ_score — registra in classifica l'esito di una partita di campionato
-- finita. Idempotente via `championship_games.scored`. Chiamabile da entrambi i
-- client a fine partita (come `rateOnlineGame`). Aggiorna i punti di ENTRAMBI i
-- membri: la guardia `scored` garantisce un solo conteggio.
-- ------------------------------------------------------------
create or replace function public.champ_score(p_friend_game_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  cg championship_games;
  fg friend_games;
  w_pts numeric; b_pts numeric;
begin
  if auth.uid() is null then
    raise exception 'auth_required';
  end if;

  select * into cg from championship_games
  where friend_game_id = p_friend_game_id
  for update;
  if cg.id is null or cg.scored then
    return;  -- non è una partita di campionato, o già conteggiata
  end if;

  select * into fg from friend_games where id = p_friend_game_id;
  if fg.id is null or fg.status <> 'finished' or fg.result is null then
    return;  -- non ancora finita
  end if;

  if fg.result = '1-0' then w_pts := 1; b_pts := 0;
  elsif fg.result = '0-1' then w_pts := 0; b_pts := 1;
  elsif fg.result = '1/2-1/2' then w_pts := 0.5; b_pts := 0.5;
  else return;  -- risultato non conteggiabile
  end if;

  update championship_members set
    points = points + w_pts,
    played = played + 1,
    wins = wins + (w_pts = 1)::int,
    draws = draws + (w_pts = 0.5)::int,
    losses = losses + (w_pts = 0)::int
  where group_id = cg.group_id and user_id = cg.white_user_id;

  update championship_members set
    points = points + b_pts,
    played = played + 1,
    wins = wins + (b_pts = 1)::int,
    draws = draws + (b_pts = 0.5)::int,
    losses = losses + (b_pts = 0)::int
  where group_id = cg.group_id and user_id = cg.black_user_id;

  update championship_games set status = 'finished', result = fg.result, scored = true
  where id = cg.id;

  -- Libera dalla coda i due giocatori (partita conclusa).
  delete from championship_queue
  where user_id in (cg.white_user_id, cg.black_user_id) and game_id = p_friend_game_id;
end;
$$;

revoke all on function public.champ_score(uuid) from public;
grant execute on function public.champ_score(uuid) to authenticated;

-- ------------------------------------------------------------
-- champ_open_season — crea (o riusa) una stagione 'active' con dato codice.
-- Pensata per la rotazione automatica (pg_cron) o per l'admin. SECURITY DEFINER,
-- eseguibile solo da service_role / cron (nessun grant ad authenticated).
-- ------------------------------------------------------------
create or replace function public.champ_open_season(
  p_code text,
  p_label text default null,
  p_time_control text default '10+5',
  p_ends_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare s_id uuid;
begin
  -- Nasce 'open' (finestra iscrizioni). I gironi si formano poi col seeding
  -- bilanciato (`champ_seed_season`), che porta la stagione ad 'active'.
  insert into championship_seasons (code, label, status, time_control_id, ends_at)
    values (p_code, p_label, 'open', p_time_control, p_ends_at)
    on conflict (code) do nothing
    returning id into s_id;
  if s_id is null then
    select id into s_id from championship_seasons where code = p_code;
  end if;
  return s_id;
end;
$$;

revoke all on function public.champ_open_season(text, text, text, timestamptz) from public;
revoke execute on function public.champ_open_season(text, text, text, timestamptz) from anon, authenticated;

-- ------------------------------------------------------------
-- champ_close_season — chiude una stagione: applica le penalità forfait,
-- calcola classifica finale e spareggio di promozione (1° +1, ultimo −1).
--   • forfait = partite non disputate = (taglia girone − 1 − giocate), min 0;
--   • penalità: dal 3° forfait in poi, −1 punto ciascuno → max(0, forfeits − 2);
--   • rank per girone: punti (al netto penalità) desc, poi seed_rating desc;
--   • rank_shift: +1 al 1°, −1 all'ultimo, 0 agli altri.
-- ------------------------------------------------------------
create or replace function public.champ_close_season(p_season_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  g record;
  m record;
  n int;
  r int;
begin
  -- Classifica, forfait e spareggio per ciascun girone.
  for g in select id from championship_groups where season_id = p_season_id loop
    select count(*) into n from championship_members where group_id = g.id;

    -- Forfait = partite non disputate nel round-robin del girone (taglia − 1 − giocate);
    -- penalità dal 3° forfait in poi.
    update championship_members set
      forfeits = greatest(0, (n - 1) - played),
      penalty = greatest(0, greatest(0, (n - 1) - played) - 2)
    where group_id = g.id;

    r := 0;
    for m in
      select id from championship_members
      where group_id = g.id
      order by (points - penalty) desc, seed_rating desc, joined_at asc
    loop
      r := r + 1;
      update championship_members set
        final_rank = r,
        rank_shift = case when r = 1 then 1 when r = n and n > 1 then -1 else 0 end
      where id = m.id;
    end loop;
  end loop;

  update championship_seasons set status = 'closed' where id = p_season_id;
end;
$$;

revoke all on function public.champ_close_season(uuid) from public;
revoke execute on function public.champ_close_season(uuid) from anon, authenticated;

-- ------------------------------------------------------------
-- 6) Rotazione automatica (opzionale, se pg_cron è disponibile).
-- Ciclo mensile: il 1° apre la stagione ('open', finestra iscrizioni); il 4°
-- forma i gironi bilanciati per rating e attiva; ogni notte chiude le scadute.
-- Se pg_cron non c'è, gestione via champ_open_season/champ_seed_season/champ_close_season.
-- ------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    -- Chiudi le stagioni attive scadute, ogni notte.
    perform cron.schedule(
      'champ-close-expired', '5 0 * * *',
      $cron$
        do $inner$
        declare s record;
        begin
          for s in select id from championship_seasons
                   where status = 'active' and ends_at is not null and ends_at <= now() loop
            perform public.champ_close_season(s.id);
          end loop;
        end $inner$;
      $cron$
    );
    -- Apri la stagione del mese (finestra iscrizioni), il 1° alle 00:10.
    perform cron.schedule(
      'champ-open-monthly', '10 0 1 * *',
      $cron$
        select public.champ_open_season(
          to_char(now(), 'YYYY-MM'),
          to_char(now(), 'TMMonth YYYY'),
          '10+5',
          (date_trunc('month', now()) + interval '1 month' - interval '1 second')
        );
      $cron$
    );
    -- Chiusa la finestra iscrizioni (il 4° alle 00:10): seeding bilanciato →
    -- gironi formati e stagione 'active'.
    perform cron.schedule(
      'champ-seed-monthly', '10 0 4 * *',
      $cron$
        do $inner$
        declare s record;
        begin
          for s in select id from championship_seasons where status = 'open' loop
            perform public.champ_seed_season(s.id);
          end loop;
        end $inner$;
      $cron$
    );
  end if;
end $$;

-- Stagione inaugurale in 'open': iscriviti, poi un admin (o il cron) chiama
-- champ_seed_season per formare i gironi bilanciati e avviare il gioco.
insert into championship_seasons (code, label, status, time_control_id, ends_at)
  values (
    to_char(now(), 'YYYY-MM'),
    'Stagione inaugurale',
    'open',
    '10+5',
    (date_trunc('month', now()) + interval '1 month' - interval '1 second')
  )
  on conflict (code) do nothing;
