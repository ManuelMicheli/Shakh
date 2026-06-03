-- ============================================================
-- Shakh — Partite contro un amico (in differita, online)
-- Due giocatori AUTENTICATI giocano una partita asincrona sincronizzata
-- in tempo reale (Supabase Realtime). Nessun service role: l'auth è via
-- auth.uid() + RLS. Il join (chi entra non è ancora partecipante) passa
-- da una funzione SECURITY DEFINER che fa tutti i controlli.
--
-- La partita "stesso dispositivo" è interamente client-side: non tocca il DB.
-- La legalità delle mosse è validata lato server nelle Server Action (chess.js).
-- ============================================================

create type friend_game_status as enum ('waiting', 'ongoing', 'finished', 'aborted');

create table friend_games (
  id uuid primary key default gen_random_uuid(),
  -- stato scacchistico
  start_fen text not null default 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  fen text not null default 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  pgn text not null default '',
  moves jsonb not null default '[]'::jsonb,   -- [{san,from,to,promotion,fen}]
  turn char(1) not null default 'w',          -- 'w' | 'b' (lato al tratto)
  status friend_game_status not null default 'waiting',
  -- giocatori (entrambi devono avere un account)
  white_user_id uuid references profiles(id) on delete set null,
  black_user_id uuid references profiles(id) on delete set null,
  white_name text,
  black_name text,
  creator_color char(1) not null default 'w',
  -- orologio (initial_ms null = partita illimitata, senza orologio)
  initial_ms integer,
  increment_ms integer not null default 0,
  white_ms integer,
  black_ms integer,
  last_move_at timestamptz,
  -- esito
  result text,            -- '1-0' | '0-1' | '1/2-1/2'
  end_reason text,        -- 'checkmate'|'resign'|'timeout'|'stalemate'|'draw'|'agreement'|'aborted'
  draw_offer_by char(1),  -- 'w' | 'b' | null (proposta di patta pendente)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on friend_games (white_user_id);
create index on friend_games (black_user_id);
create index on friend_games (status);
create index on friend_games (updated_at desc);

create trigger friend_games_set_updated_at
  before update on friend_games
  for each row execute function public.set_updated_at();

alter table friend_games enable row level security;

-- Lettura: i due partecipanti, oppure chiunque (loggato) su una partita in
-- attesa, così può aprire il link e unirsi.
create policy friend_games_select on friend_games for select
  using (
    white_user_id = auth.uid()
    or black_user_id = auth.uid()
    or status = 'waiting'
  );

-- Creazione: il creatore mette sé stesso sul proprio colore, l'altro lato vuoto.
create policy friend_games_insert on friend_games for insert
  with check (
    (creator_color = 'w' and white_user_id = auth.uid() and black_user_id is null)
    or (creator_color = 'b' and black_user_id = auth.uid() and white_user_id is null)
  );

-- Aggiornamento (mosse, abbandono, patta): solo i due partecipanti.
create policy friend_games_update on friend_games for update
  using (white_user_id = auth.uid() or black_user_id = auth.uid())
  with check (white_user_id = auth.uid() or black_user_id = auth.uid());

-- ------------------------------------------------------------
-- Join via codice/link: SECURITY DEFINER perché chi entra NON è ancora
-- partecipante (la policy di UPDATE lo bloccherebbe). Qui si validano stato,
-- posto libero e si registra il giocatore + nome dal profilo.
-- ------------------------------------------------------------
create or replace function public.friend_game_join(p_id uuid)
returns friend_games
language plpgsql
security definer
set search_path = public
as $$
declare
  g friend_games;
  uname text;
begin
  if auth.uid() is null then
    raise exception 'auth_required';
  end if;
  select * into g from friend_games where id = p_id for update;
  if g.id is null then
    raise exception 'not_found';
  end if;
  -- già dentro: idempotente
  if g.white_user_id = auth.uid() or g.black_user_id = auth.uid() then
    return g;
  end if;
  if g.status <> 'waiting' then
    raise exception 'not_joinable';
  end if;
  select display_name into uname from profiles where id = auth.uid();
  if g.white_user_id is null then
    update friend_games set
      white_user_id = auth.uid(),
      white_name = coalesce(uname, 'Avversario'),
      status = 'ongoing',
      last_move_at = now()
    where id = p_id returning * into g;
  elsif g.black_user_id is null then
    update friend_games set
      black_user_id = auth.uid(),
      black_name = coalesce(uname, 'Avversario'),
      status = 'ongoing',
      last_move_at = now()
    where id = p_id returning * into g;
  else
    raise exception 'full';
  end if;
  return g;
end;
$$;

revoke all on function public.friend_game_join(uuid) from public;
grant execute on function public.friend_game_join(uuid) to authenticated;

-- Realtime: i due client si sottoscrivono alla riga della partita.
alter publication supabase_realtime add table friend_games;
alter table friend_games replica identity full;
