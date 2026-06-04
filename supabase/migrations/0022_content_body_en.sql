-- 0022_content_body_en.sql
-- ============================================================
-- Body delle lezioni bilingue: aggiunge `body_en` (jsonb) a content_items e
-- traps. La colonna `body` esistente resta l'italiano (sorgente dei seed).
-- I valori EN vengono popolati a parte (traduzione dei soli campi testuali:
-- intro, steps[].text, nodes[].comment; FEN/SAN/uci/shapes invariati).
-- Lo strato di lettura sceglie body_en quando il locale è 'en' ed esiste,
-- altrimenti ricade su `body` (italiano).
-- Idempotente.
-- ============================================================
alter table content_items add column if not exists body_en jsonb;
alter table traps add column if not exists body_en jsonb;
