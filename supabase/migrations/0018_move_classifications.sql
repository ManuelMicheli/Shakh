-- Estende l'enum move_classification con le categorie aggiuntive in stile
-- "review" (chess.com/Lichess): great (Grande), excellent (Ottima), miss
-- (Mossa mancata). Le tre nuove voci si affiancano alle esistenti
-- (brilliant, best, good, inaccuracy, mistake, blunder, book).
--
-- ALTER TYPE ... ADD VALUE è idempotente con IF NOT EXISTS e non può girare
-- dentro una transazione esplicita: ogni statement è autonomo.

alter type move_classification add value if not exists 'great';
alter type move_classification add value if not exists 'excellent';
alter type move_classification add value if not exists 'miss';
