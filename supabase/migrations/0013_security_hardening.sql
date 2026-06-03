-- ============================================================
-- Shakh — 0013: hardening sicurezza backend/DB
-- Correzioni emerse dall'audit:
--   A) Escalation di privilegi: un utente poteva auto-promuoversi a
--      instructor/admin aggiornando profiles.role (profiles_update_own).
--   B) group_invites_select esponeva TUTTI i codici invito validi a
--      qualunque utente autenticato (join arbitrario, anche come owner).
--   C) group_invites.used_by senza ON DELETE: bloccava la cancellazione
--      account (diritto all'oblio) per chi aveva usato un invito.
--   D) handle_new_user: il cast ::boolean di parental_consent non era
--      protetto e poteva far fallire l'intera registrazione.
-- ============================================================

-- ------------------------------------------------------------
-- A) Blocco escalation del ruolo.
-- RLS with-check non può esprimere "colonna invariata", quindi si usa un
-- trigger BEFORE UPDATE. Un utente autenticato via API (auth.uid() valorizzato)
-- non può cambiare il PROPRIO role: il valore viene ripristinato a quello
-- precedente. Le promozioni a staff restano possibili fuori banda (SQL editor /
-- service role, dove auth.uid() è null).
-- ------------------------------------------------------------
create or replace function public.prevent_role_self_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and new.role is distinct from old.role then
    new.role := old.role;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_pin_role on profiles;
create trigger profiles_pin_role
  before update on profiles
  for each row execute function public.prevent_role_self_change();

-- ------------------------------------------------------------
-- B) group_invites_select: solo staff del gruppo. Il join via codice usa le
-- funzioni SECURITY DEFINER join_group_by_code / invite_preview (che cercano
-- l'invito per codice esatto e bypassano la RLS), quindi i client non hanno
-- mai bisogno di leggere direttamente la tabella. Si rimuove il ramo aperto
-- che esponeva ogni invito valido.
-- ------------------------------------------------------------
drop policy if exists group_invites_select on group_invites;
create policy group_invites_select on group_invites
  for select using (
    exists (
      select 1 from group_members gm
      where gm.group_id = group_invites.group_id
        and gm.user_id = auth.uid()
        and gm.role_in_group in ('instructor', 'owner')
    )
  );

-- ------------------------------------------------------------
-- C) group_invites.used_by → ON DELETE SET NULL, così la cancellazione del
-- profilo (e a cascata di auth.users) non viene bloccata. L'invito resta come
-- record storico con used_by nullo.
-- ------------------------------------------------------------
alter table group_invites drop constraint if exists group_invites_used_by_fkey;
alter table group_invites
  add constraint group_invites_used_by_fkey
  foreign key (used_by) references profiles(id) on delete set null;

-- ------------------------------------------------------------
-- D) handle_new_user: cast di parental_consent protetto. Un valore non-boolean
-- nei metadati di signup non deve far fallire la creazione utente.
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  bd date;
  pc boolean := false;
begin
  begin
    bd := nullif(new.raw_user_meta_data ->> 'birth_date', '')::date;
  exception when others then
    bd := null;
  end;

  begin
    pc := coalesce((new.raw_user_meta_data ->> 'parental_consent')::boolean, false);
  exception when others then
    pc := false;
  end;

  insert into public.profiles (id, display_name, birth_date, parental_consent, parental_consent_at, parental_email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'full_name'),
    bd,
    pc,
    case when pc then now() else null end,
    nullif(new.raw_user_meta_data ->> 'parental_email', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
