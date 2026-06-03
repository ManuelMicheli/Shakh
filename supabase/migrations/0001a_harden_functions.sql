-- ============================================================
-- Shakh — 0001a: hardening delle funzioni (lint Supabase)
-- Applicata in remoto subito dopo 0001_init (versione 20260602115941).
-- File aggiunto a posteriori per allineare le migrazioni locali a quelle remote.
-- ============================================================

-- Fissa search_path su set_updated_at (lint 0011).
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- handle_new_user è solo trigger: non deve essere invocabile via RPC (lint 0028/0029).
revoke all on function public.handle_new_user() from public, anon, authenticated;

-- is_group_instructor_of serve solo dentro le policy RLS (ruolo authenticated).
-- Toglie l'esposizione RPC ad anon; authenticated la mantiene per la valutazione RLS.
revoke all on function public.is_group_instructor_of(uuid) from public, anon;
