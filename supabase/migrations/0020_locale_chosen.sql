-- ============================================================
-- Lingua: scelta esplicita al primo accesso.
-- `locale` ha sempre un default ('it'), quindi non basta a distinguere
-- "non ancora scelta". Aggiungiamo un flag dedicato: finché è false mostriamo
-- il prompt di scelta lingua al primo ingresso in /app.
-- ============================================================

alter table profiles
  add column if not exists locale_chosen boolean not null default false;

comment on column profiles.locale_chosen is 'True dopo che l''utente ha scelto la lingua (primo accesso o impostazioni).';
