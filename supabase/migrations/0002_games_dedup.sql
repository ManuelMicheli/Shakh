-- ============================================================
-- Shakh — Dedup partite importate (prompt 03)
-- Evita duplicati su (user_id, source, external_id) quando l'id esterno è noto
-- (es. id partita Lichess). Le partite incollate senza id (external_id null)
-- non sono soggette al vincolo (null multipli ammessi).
-- ============================================================
create unique index if not exists games_user_source_extid_uniq
  on games (user_id, source, external_id)
  where external_id is not null;
