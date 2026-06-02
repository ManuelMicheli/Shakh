-- 0004_theory_seed.sql
-- Lezione campione del modulo Teoria (prompt 06a §8): valida l'infrastruttura
-- end-to-end. NON è contenuto reale del prodotto (arriva in 06b/06c).
-- Generato da scripts/seed-theory.mts — rigenerabile e idempotente sullo slug.

insert into content_items (type, eco_code, title, slug, summary, body, start_fen, line_pgn, level, order_index, published)
values (
  'opening',
  'C50',
  'Giuoco Piano — l''idea dell''Italiana',
  'giuoco-piano-esempio',
  'Mini-lezione di esempio: l''Apertura Italiana e l''attacco a f7.',
  '{"intro":"Una mini-lezione campione sul Giuoco Piano (Apertura Italiana), per mostrare come funziona il modulo Teoria: passi guidati, varianti, explorer e coach.","tree":{"nodes":{"n0":{"id":"n0","parentId":null,"ply":0,"san":null,"uci":null,"fen":"rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1","children":["n1"]},"n1":{"id":"n1","parentId":"n0","ply":1,"san":"e4","uci":"e2e4","fen":"rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1","children":["n2"]},"n2":{"id":"n2","parentId":"n1","ply":2,"san":"e5","uci":"e7e5","fen":"rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2","children":["n3"]},"n3":{"id":"n3","parentId":"n2","ply":3,"san":"Nf3","uci":"g1f3","fen":"rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2","children":["n4"]},"n4":{"id":"n4","parentId":"n3","ply":4,"san":"Nc6","uci":"b8c6","fen":"r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3","children":["n5"]},"n5":{"id":"n5","parentId":"n4","ply":5,"san":"Bc4","uci":"f1c4","fen":"r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3","children":["n6","n7"]},"n6":{"id":"n6","parentId":"n5","ply":6,"san":"Bc5","uci":"f8c5","fen":"r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4","children":["n9"]},"n7":{"id":"n7","parentId":"n5","ply":6,"san":"Nf6","uci":"g8f6","fen":"r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4","children":["n8"]},"n8":{"id":"n8","parentId":"n7","ply":7,"san":"Ng5","uci":"f3g5","fen":"r1bqkb1r/pppp1ppp/2n2n2/4p1N1/2B1P3/8/PPPP1PPP/RNBQK2R b KQkq - 5 4","children":[],"comment":"Difesa dei due cavalli: 4. Cg5 attacca subito f7, gioco tagliente.","nags":[5]},"n9":{"id":"n9","parentId":"n6","ply":7,"san":"c3","uci":"c2c3","fen":"r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/2P2N2/PP1P1PPP/RNBQK2R b KQkq - 0 4","children":["n10"]},"n10":{"id":"n10","parentId":"n9","ply":8,"san":"Nf6","uci":"g8f6","fen":"r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2P2N2/PP1P1PPP/RNBQK2R w KQkq - 1 5","children":[]}},"rootId":"n0","seq":11},"steps":[{"nodeId":"n1","text":"Il Bianco occupa il centro e libera alfiere e donna. È la mossa di apertura più diretta.","shapes":[{"orig":"e2","dest":"e4","brush":"green"}]},{"nodeId":"n5","text":"L''Alfiere italiano si punta su f7, la casa più debole del campo nero (difesa dal solo Re). È l''idea che dà il nome all''apertura.","shapes":[{"orig":"c4","dest":"f7","brush":"red"},{"orig":"f7","brush":"red"}],"highlightMoves":["Bc5","Nf6"]},{"nodeId":"n6","text":"Il Nero risponde in modo simmetrico: anche il suo alfiere mira a f2. Nasce il Giuoco Piano, posizionale e equilibrato."},{"nodeId":"n9","text":"Con c3 il Bianco prepara d4: vuole costruire un grande centro di pedoni e guadagnare spazio. Prova a deviare con un''altra mossa per vedere cosa dice il motore."}]}'::jsonb,
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 (3... Nf6 4. Ng5!? {Difesa dei due cavalli: 4. Cg5 attacca subito f7, gioco tagliente.}) 4. c3 Nf6',
  0,
  0,
  true
)
on conflict (slug) do update set
  type = excluded.type,
  eco_code = excluded.eco_code,
  title = excluded.title,
  summary = excluded.summary,
  body = excluded.body,
  start_fen = excluded.start_fen,
  line_pgn = excluded.line_pgn,
  published = excluded.published;
