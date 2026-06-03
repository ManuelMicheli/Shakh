-- ============================================================
-- Shakh — Proprietà della partita ai fini dell'analisi del profilo
-- Una partita incide su punti deboli, Rating Shakh e statistiche del profilo
-- SOLO se appartiene a un account online VERIFICATO dell'utente. Le partite
-- importate di giocatori esterni (curiosità, studio) restano consultabili e
-- analizzabili, ma NON alterano il profilo dell'utente.
--
-- `counts_for_profile`:
--   true  → partita del proprio account verificato (o seeding post-verifica)
--   false → giocatore esterno / account non verificato / PGN incollato
--
-- Default true: le partite già presenti restano conteggiate (nessun ricalcolo
-- retroattivo). Solo i nuovi import seguono la regola, decisa all'inserimento.
-- ============================================================

alter table games
  add column counts_for_profile boolean not null default true;

comment on column games.counts_for_profile is
  'true solo se la partita è del proprio account verificato; le partite di giocatori esterni non incidono sul profilo.';
