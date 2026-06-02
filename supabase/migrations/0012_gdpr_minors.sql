-- ============================================================
-- PROMPT 10 — GDPR: gestione minori
-- Soglia consenso digitale autonomo in Italia: 14 anni (art. 8 GDPR +
-- Codice Privacy). Raccogliamo la data di nascita alla registrazione; sotto i
-- 14 anni serve il consenso del genitore/tutore.
-- ============================================================

alter table profiles
  add column if not exists birth_date date,
  add column if not exists parental_consent boolean not null default false,
  add column if not exists parental_consent_at timestamptz,
  add column if not exists parental_email text;

comment on column profiles.birth_date is 'Data di nascita per la verifica del consenso digitale (>=14 in Italia).';
comment on column profiles.parental_consent is 'Consenso genitoriale per utenti <14 (base giuridica da validare legalmente).';

-- Età in anni a una data di riferimento (default oggi). Helper riusabile.
create or replace function public.age_years(d date)
returns int
language sql
immutable
as $$
  select case when d is null then null
              else extract(year from age(current_date, d))::int end;
$$;

-- Aggiorna il trigger di creazione profilo per popolare anche la data di
-- nascita e l'eventuale consenso genitoriale dai metadati di signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  bd date;
begin
  begin
    bd := nullif(new.raw_user_meta_data ->> 'birth_date', '')::date;
  exception when others then
    bd := null;
  end;

  insert into public.profiles (id, display_name, birth_date, parental_consent, parental_consent_at, parental_email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'full_name'),
    bd,
    coalesce((new.raw_user_meta_data ->> 'parental_consent')::boolean, false),
    case when (new.raw_user_meta_data ->> 'parental_consent')::boolean then now() else null end,
    nullif(new.raw_user_meta_data ->> 'parental_email', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
