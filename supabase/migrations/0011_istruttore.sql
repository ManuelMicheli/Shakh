-- ============================================================
-- Shakh — Prompt 09: Layer istruttore / circolo (Strato 1, B2B)
-- VISTA AGGREGATA del core: inviti ai gruppi, generalizzazione delle
-- assegnazioni, stato per-allievo delle assegnazioni. Nessuna logica di
-- prodotto nuova: si aggiungono solo relazioni e stato.
--
-- SICUREZZA: l'istruttore legge i dati di terzi (allievi) SOLO tramite le
-- policy RLS del 00 (is_group_instructor_of). Qui non si aggira mai la RLS.
-- ============================================================

-- ------------------------------------------------------------
-- Inviti ai gruppi (join via codice/link)
-- ------------------------------------------------------------
create table group_invites (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  code text unique not null,
  email text,                          -- opzionale (invito mirato)
  role_in_group group_member_role not null default 'member',
  expires_at timestamptz,
  used_by uuid references profiles(id),
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index on group_invites (code);
create index on group_invites (group_id);

-- ------------------------------------------------------------
-- Generalizzazione delle assegnazioni: oltre alle lezioni, anche
-- puzzle-set, finali, trappole, repertori, nodi percorso.
-- ------------------------------------------------------------
alter table assignments add column ref_type text;  -- 'lesson'|'puzzle_set'|'endgame'|'trap'|'repertoire'|'path_node'
alter table assignments add column ref_id uuid;     -- id della risorsa (nullable per puzzle_set)
alter table assignments add column params jsonb;     -- es. {theme:'fork', count:20} per i puzzle-set

-- ------------------------------------------------------------
-- Stato per-allievo di un'assegnazione.
-- Necessario perché un'assegnazione può puntare a un GRUPPO: ogni membro
-- ha il proprio avanzamento. Il completamento è DERIVATO dall'engine dei
-- requisiti del 07 (dai progressi reali) oppure marcato a mano dall'allievo.
-- ------------------------------------------------------------
create table assignment_progress (
  assignment_id uuid not null references assignments(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  status assignment_status not null default 'assigned',
  manual boolean not null default false,   -- true se segnata fatta a mano
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (assignment_id, user_id)
);
create index on assignment_progress (user_id);

create trigger assignment_progress_set_updated_at
  before update on assignment_progress
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- Join via codice: SECURITY DEFINER perché il join scrive group_members
-- (di cui l'allievo non è owner) e marca l'invito come usato. Tutti i
-- controlli (validità, scadenza, email, uso singolo) sono fatti qui dentro.
-- ------------------------------------------------------------
create or replace function public.join_group_by_code(invite_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  inv group_invites;
  my_email text;
begin
  if auth.uid() is null then
    raise exception 'Devi accedere per unirti a un gruppo.';
  end if;

  select * into inv from group_invites where code = invite_code;
  if inv.id is null then
    raise exception 'Invito non valido.';
  end if;
  if inv.used_by is not null then
    raise exception 'Invito già utilizzato.';
  end if;
  if inv.expires_at is not null and inv.expires_at <= now() then
    raise exception 'Invito scaduto.';
  end if;
  if inv.email is not null then
    select email into my_email from auth.users where id = auth.uid();
    if lower(inv.email) <> lower(coalesce(my_email, '')) then
      raise exception 'Questo invito è riservato a un altro indirizzo email.';
    end if;
  end if;

  insert into group_members (group_id, user_id, role_in_group)
  values (inv.group_id, auth.uid(), inv.role_in_group)
  on conflict (group_id, user_id) do nothing;

  update group_invites
    set used_by = auth.uid(), used_at = now()
    where id = inv.id;

  return inv.group_id;
end;
$$;

-- ------------------------------------------------------------
-- Anteprima invito per la pagina di join: il futuro membro non può ancora
-- leggere `groups` (non ne fa parte), quindi un definer espone solo i campi
-- necessari al clickwrap (nome gruppo, tipo, ruolo, validità).
-- ------------------------------------------------------------
create or replace function public.invite_preview(invite_code text)
returns table (group_name text, group_type group_type, role_in_group group_member_role, valid boolean)
language sql
security definer
set search_path = public
stable
as $$
  select
    g.name,
    g.type,
    gi.role_in_group,
    (gi.used_by is null and (gi.expires_at is null or gi.expires_at > now())) as valid
  from group_invites gi
  join groups g on g.id = gi.group_id
  where gi.code = invite_code;
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table group_invites       enable row level security;
alter table assignment_progress enable row level security;

-- group_invites: gestiti dall'owner/instructor del gruppo; leggibili da chi
-- possiede il codice per il join (invito non usato e non scaduto).
create policy group_invites_select on group_invites
  for select using (
    exists (
      select 1 from group_members gm
      where gm.group_id = group_invites.group_id
        and gm.user_id = auth.uid()
        and gm.role_in_group in ('instructor', 'owner')
    )
    or (used_by is null and (expires_at is null or expires_at > now()))
  );
create policy group_invites_write on group_invites
  for all using (
    exists (
      select 1 from group_members gm
      where gm.group_id = group_invites.group_id
        and gm.user_id = auth.uid()
        and gm.role_in_group in ('instructor', 'owner')
    )
  ) with check (
    exists (
      select 1 from group_members gm
      where gm.group_id = group_invites.group_id
        and gm.user_id = auth.uid()
        and gm.role_in_group in ('instructor', 'owner')
    )
  );

-- assignment_progress: accesso pieno ai propri; istruttore sola lettura
-- (stesso schema dei progressi del core).
create policy ap_select on assignment_progress
  for select using (
    user_id = auth.uid() or public.is_group_instructor_of(user_id)
  );
create policy ap_write_own on assignment_progress
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Nota: le nuove colonne di `assignments` ereditano le policy esistenti
-- (assignments_select / assignments_write_by_author) definite nel 00.
