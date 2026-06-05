-- ============================================================
-- Shakh — Lega/Campionato: blocco funzioni admin (hardening)
--
-- Le funzioni admin del Campionato (seed/open/close) NON hanno guardia interna
-- su auth.uid() e mutano lo stato globale della competizione: vanno eseguibili
-- SOLO da service_role/cron, mai da utenti. In Supabase i ruoli anon/authenticated
-- ricevono un grant EXECUTE esplicito (non solo via PUBLIC), quindi il
-- `revoke ... from public` in 0025 non basta: serve la revoca esplicita.
-- (Le funzioni rivolte all'utente — enroll/enqueue/cancel/score — restano
-- eseguibili da authenticated: hanno la guardia auth.uid() al loro interno.)
-- ============================================================
revoke execute on function public.champ_seed_season(uuid) from anon, authenticated;
revoke execute on function public.champ_open_season(text, text, text, timestamptz) from anon, authenticated;
revoke execute on function public.champ_close_season(uuid) from anon, authenticated;
