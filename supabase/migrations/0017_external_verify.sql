-- ============================================================
-- Shakh — Verifica di proprietà degli account online (bio-token)
-- Il rating di un account incide sul Rating Shakh SOLO dopo verifica: l'utente
-- inserisce un token usa-e-getta nella bio/profilo della piattaforma, noi lo
-- rileggiamo dall'API pubblica. Finché `verified=false` il dominio 'external'
-- non viene alimentato da quell'account.
-- ============================================================

alter table external_accounts
  add column verify_token text,
  add column verify_expires_at timestamptz;
