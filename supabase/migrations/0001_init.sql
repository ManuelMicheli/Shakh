-- ============================================================
-- Shakh — Migration iniziale (Strato 0 + predisposizione Strato 1)
-- Applicabile da zero su un progetto Supabase pulito.
-- ============================================================

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

-- ============================================================
-- TRIGGER / FUNZIONI
-- ============================================================

-- Crea automaticamente una riga profiles a ogni nuovo auth.users.
-- display_name letto dai metadati passati in fase di signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'full_name')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Aggiorna updated_at a ogni UPDATE.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on profiles
  for each row execute function public.set_updated_at();

create trigger user_progress_set_updated_at
  before update on user_progress
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- Helper RLS: l'utente corrente è istruttore/owner di un gruppo
-- a cui appartiene il target? (security definer per evitare ricorsione RLS)
-- ------------------------------------------------------------
create or replace function public.is_group_instructor_of(target_user uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from group_members gm_target
    join group_members gm_me on gm_me.group_id = gm_target.group_id
    where gm_target.user_id = target_user
      and gm_me.user_id = auth.uid()
      and gm_me.role_in_group in ('instructor', 'owner')
  );
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table profiles            enable row level security;
alter table groups              enable row level security;
alter table group_members       enable row level security;
alter table content_items       enable row level security;
alter table puzzles             enable row level security;
alter table user_puzzle_attempts enable row level security;
alter table user_progress       enable row level security;
alter table repertoires         enable row level security;
alter table repertoire_moves    enable row level security;
alter table games               enable row level security;
alter table game_analysis       enable row level security;
alter table assignments         enable row level security;

-- ------------------------------------------------------------
-- profiles
-- ------------------------------------------------------------
-- Ognuno legge la propria riga; gli istruttori leggono i profili dei membri
-- dei gruppi che gestiscono.
create policy profiles_select_own on profiles
  for select using (
    id = auth.uid() or public.is_group_instructor_of(id)
  );
-- Ognuno aggiorna solo la propria riga.
create policy profiles_update_own on profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- ------------------------------------------------------------
-- groups: il proprietario gestisce tutto; i membri leggono il proprio gruppo.
-- ------------------------------------------------------------
create policy groups_select_member on groups
  for select using (
    owner_id = auth.uid()
    or exists (
      select 1 from group_members gm
      where gm.group_id = groups.id and gm.user_id = auth.uid()
    )
  );
create policy groups_owner_insert on groups
  for insert with check (owner_id = auth.uid());
create policy groups_owner_update on groups
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy groups_owner_delete on groups
  for delete using (owner_id = auth.uid());

-- ------------------------------------------------------------
-- group_members: il proprietario del gruppo gestisce; il membro legge la
-- propria appartenenza.
-- ------------------------------------------------------------
create policy group_members_select on group_members
  for select using (
    user_id = auth.uid()
    or exists (
      select 1 from groups g
      where g.id = group_members.group_id and g.owner_id = auth.uid()
    )
  );
create policy group_members_owner_write on group_members
  for all using (
    exists (
      select 1 from groups g
      where g.id = group_members.group_id and g.owner_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from groups g
      where g.id = group_members.group_id and g.owner_id = auth.uid()
    )
  );

-- ------------------------------------------------------------
-- content_items: contenuti, non dati personali.
-- Lettura pubblica per le righe published; scrittura solo admin/instructor.
-- ------------------------------------------------------------
create policy content_items_select_published on content_items
  for select using (
    published = true
    or exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role in ('admin', 'instructor')
    )
  );
create policy content_items_staff_write on content_items
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
-- puzzles: lettura pubblica (contenuti); scrittura solo admin/instructor.
-- ------------------------------------------------------------
create policy puzzles_select_all on puzzles
  for select using (true);
create policy puzzles_staff_write on puzzles
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
-- user_puzzle_attempts: l'utente accede solo ai propri dati;
-- l'istruttore può LEGGERE i dati dei membri dei suoi gruppi.
-- ------------------------------------------------------------
create policy upa_select on user_puzzle_attempts
  for select using (
    user_id = auth.uid() or public.is_group_instructor_of(user_id)
  );
create policy upa_write_own on user_puzzle_attempts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ------------------------------------------------------------
-- user_progress: idem (proprio accesso pieno; istruttore sola lettura).
-- ------------------------------------------------------------
create policy progress_select on user_progress
  for select using (
    user_id = auth.uid() or public.is_group_instructor_of(user_id)
  );
create policy progress_write_own on user_progress
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ------------------------------------------------------------
-- games: idem.
-- ------------------------------------------------------------
create policy games_select on games
  for select using (
    user_id = auth.uid() or public.is_group_instructor_of(user_id)
  );
create policy games_write_own on games
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ------------------------------------------------------------
-- game_analysis: accesso derivato dalla partita.
-- L'utente gestisce le analisi delle proprie partite; l'istruttore legge.
-- ------------------------------------------------------------
create policy game_analysis_select on game_analysis
  for select using (
    exists (
      select 1 from games g
      where g.id = game_analysis.game_id
        and (g.user_id = auth.uid() or public.is_group_instructor_of(g.user_id))
    )
  );
create policy game_analysis_write_own on game_analysis
  for all using (
    exists (
      select 1 from games g
      where g.id = game_analysis.game_id and g.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from games g
      where g.id = game_analysis.game_id and g.user_id = auth.uid()
    )
  );

-- ------------------------------------------------------------
-- repertoires: accesso al proprietario (utente) o ai membri del gruppo proprietario.
-- ------------------------------------------------------------
create policy repertoires_select on repertoires
  for select using (
    owner_user_id = auth.uid()
    or (
      owner_group_id is not null and exists (
        select 1 from group_members gm
        where gm.group_id = repertoires.owner_group_id and gm.user_id = auth.uid()
      )
    )
  );
-- Scrittura: il proprietario utente, oppure istruttore/owner del gruppo proprietario.
create policy repertoires_write on repertoires
  for all using (
    owner_user_id = auth.uid()
    or (
      owner_group_id is not null and exists (
        select 1 from group_members gm
        where gm.group_id = repertoires.owner_group_id
          and gm.user_id = auth.uid()
          and gm.role_in_group in ('instructor', 'owner')
      )
    )
  ) with check (
    owner_user_id = auth.uid()
    or (
      owner_group_id is not null and exists (
        select 1 from group_members gm
        where gm.group_id = repertoires.owner_group_id
          and gm.user_id = auth.uid()
          and gm.role_in_group in ('instructor', 'owner')
      )
    )
  );

-- ------------------------------------------------------------
-- repertoire_moves: accesso derivato dal repertorio padre.
-- ------------------------------------------------------------
create policy repertoire_moves_select on repertoire_moves
  for select using (
    exists (
      select 1 from repertoires r
      where r.id = repertoire_moves.repertoire_id
        and (
          r.owner_user_id = auth.uid()
          or (
            r.owner_group_id is not null and exists (
              select 1 from group_members gm
              where gm.group_id = r.owner_group_id and gm.user_id = auth.uid()
            )
          )
        )
    )
  );
create policy repertoire_moves_write on repertoire_moves
  for all using (
    exists (
      select 1 from repertoires r
      where r.id = repertoire_moves.repertoire_id
        and (
          r.owner_user_id = auth.uid()
          or (
            r.owner_group_id is not null and exists (
              select 1 from group_members gm
              where gm.group_id = r.owner_group_id
                and gm.user_id = auth.uid()
                and gm.role_in_group in ('instructor', 'owner')
            )
          )
        )
    )
  ) with check (
    exists (
      select 1 from repertoires r
      where r.id = repertoire_moves.repertoire_id
        and (
          r.owner_user_id = auth.uid()
          or (
            r.owner_group_id is not null and exists (
              select 1 from group_members gm
              where gm.group_id = r.owner_group_id
                and gm.user_id = auth.uid()
                and gm.role_in_group in ('instructor', 'owner')
            )
          )
        )
    )
  );

-- ------------------------------------------------------------
-- assignments: il target_user legge le proprie; chi assegna gestisce le sue.
-- ------------------------------------------------------------
create policy assignments_select on assignments
  for select using (
    target_user_id = auth.uid()
    or assigned_by = auth.uid()
    or (
      target_group_id is not null and exists (
        select 1 from group_members gm
        where gm.group_id = assignments.target_group_id and gm.user_id = auth.uid()
      )
    )
  );
create policy assignments_write_by_author on assignments
  for all using (assigned_by = auth.uid()) with check (assigned_by = auth.uid());
