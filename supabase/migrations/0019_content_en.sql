-- 0019_content_en.sql
-- Traduzione in inglese del TESTO DELLE CARD dei contenuti seedati:
--   • content_items: title + summary (lezioni di teoria, aperture, finali, mediogioco)
--   • traps: name + opening_name
--   • path_nodes: title + description + activities (etichette dei bottoni)
-- I CORPI delle lezioni (content_items.body, traps.body) restano in italiano per
-- ora: questa migrazione tocca solo il testo visibile sulle card e i pulsanti.
-- Idempotente: UPDATE per slug, rieseguibile senza effetti collaterali.

-- ============================================================
-- content_items — title + summary
-- ============================================================
update content_items set
  title = 'Giuoco Piano — the Italian Game idea',
  summary = 'Sample mini-lesson: the Italian Game and the attack on f7.'
  where slug = 'giuoco-piano-esempio';

update content_items set
  title = 'Open games (1.e4 e5)',
  summary = 'The openings that arise from 1.e4 e5.'
  where slug = 'aperture-aperte';

update content_items set
  title = 'Caro-Kann Defense (1.e4 c6)',
  summary = 'A solid, principled defense against 1.e4.'
  where slug = 'caro-kann';

update content_items set
  title = 'Italian Game — Giuoco Piano',
  summary = 'Draft for review: development, f7 and the c3-d4 center.'
  where slug = 'italiana-giuoco-piano';

update content_items set
  title = 'Caro-Kann — main line',
  summary = 'Draft for review: the active bishop on f5 and the typical structure.'
  where slug = 'caro-kann-principale';

update content_items set
  title = 'King and pawn vs king',
  summary = 'Opposition and the rule of the square: the basis of all endgames.'
  where slug = 're-e-pedone-contro-re';

update content_items set
  title = 'Lucena position (rook)',
  summary = 'The "bridge" technique to win the rook endgame with a single pawn.'
  where slug = 'posizione-di-lucena';

update content_items set
  title = 'Philidor position (rook)',
  summary = 'The defense that draws the rook endgame when your opponent is ahead.'
  where slug = 'posizione-di-philidor';

update content_items set
  title = 'Basic checkmates',
  summary = 'King+Queen vs King and King+Rook vs King: the technique to deliver mate.'
  where slug = 'matti-elementari';

update content_items set
  title = 'Queen vs pawn',
  summary = 'When the queen beats a pawn on the 7th rank — and when it is a draw.'
  where slug = 'donna-contro-pedone';

update content_items set
  title = 'The isolated queen''s pawn (IQP)',
  summary = 'Playing with the IQP (activity and attack) and against it (blockade, aim for the endgame).'
  where slug = 'pedone-isolano-di-donna-iqp';

update content_items set
  title = 'Open file and the seventh rank',
  summary = 'Seize the open file, double the rooks, invade the seventh rank.'
  where slug = 'colonna-aperta-e-settima-traversa';

update content_items set
  title = 'Weak squares and outposts',
  summary = 'Create and exploit an outpost: the good knight vs the bad bishop.'
  where slug = 'case-deboli-e-avamposti';

-- ============================================================
-- traps — name + opening_name
-- ============================================================
update traps set name = 'Légal''s Mate',              opening_name = 'Philidor Defense'          where slug = 'matto-di-legal';
update traps set name = 'Fried Liver Attack',         opening_name = 'Two Knights Defense'       where slug = 'fegato-fritto';
update traps set name = 'Lasker Trap (Albin)',        opening_name = 'Albin Countergambit'       where slug = 'trappola-di-lasker-albin';
update traps set name = 'Blackburne Shilling Gambit', opening_name = 'Italian Game'              where slug = 'blackburne-shilling-gambit';
update traps set name = 'Fishing Pole Trap',          opening_name = 'Ruy Lopez, Berlin Defense' where slug = 'fishing-pole';
update traps set name = 'Elephant Trap',              opening_name = 'Queen''s Gambit Declined'  where slug = 'elephant-trap';
update traps set name = 'Mortimer Trap',              opening_name = 'Ruy Lopez, Mortimer Defense' where slug = 'trappola-di-mortimer';
update traps set name = 'Englund Gambit Trap',        opening_name = 'Englund Gambit'            where slug = 'gambetto-englund';
update traps set name = 'Kieninger Trap (Budapest)',  opening_name = 'Budapest Gambit'           where slug = 'trappola-kieninger-budapest';
update traps set name = 'Damiano Defense (the refutation)', opening_name = 'Damiano Defense'     where slug = 'difesa-damiano';

-- ============================================================
-- path_nodes — title + description + activities (button labels)
-- ============================================================
update path_nodes set
  title = 'Basic checkmates',
  description = 'King+Queen and King+Rook vs a lone King: the technique to mate with a decisive advantage.',
  activities = '[{"label":"Study the lesson","href":"/app/teoria/matti-elementari"}]'
  where slug = 'l0-matti-elementari';

update path_nodes set
  title = 'First contact with tactics',
  description = 'Mate in one: recognizing an immediate checkmate.',
  activities = '[{"label":"Train on puzzles","href":"/app/tattiche"}]'
  where slug = 'l0-primo-contatto-tattica';

update path_nodes set
  title = 'King and pawn',
  description = 'The King and pawn vs King endgame: the rule of the square and promotion.',
  activities = '[{"label":"Study the lesson","href":"/app/teoria/re-e-pedone-contro-re"}]'
  where slug = 'l0-re-e-pedone';

update path_nodes set
  title = 'Fundamental tactical themes',
  description = 'Fork, pin and skewer: the first three motifs to master.',
  activities = '[{"label":"Train by theme","href":"/app/tattiche"}]'
  where slug = 'l1-temi-fondamentali';

update path_nodes set
  title = 'Mate in two',
  description = 'Calculating a forced mate-in-two combination.',
  activities = '[{"label":"Train on puzzles","href":"/app/tattiche"}]'
  where slug = 'l1-matto-in-due';

update path_nodes set
  title = 'Opposition and pawn endgames',
  description = 'Opposition decides King and pawn endgames: apply it until you win.',
  activities = '[{"label":"Practice endgames","href":"/app/teoria/re-e-pedone-contro-re"}]'
  where slug = 'l1-opposizione';

update path_nodes set
  title = 'Tactical rating 1300',
  description = 'Consolidate basic tactics up to a 1300 rating.',
  activities = '[{"label":"Adaptive challenge","href":"/app/tattiche"}]'
  where slug = 'l1-rating-1300';

update path_nodes set
  title = 'Opening principles',
  description = 'Center, development and king safety applied to an open game.',
  activities = '[{"label":"Study the Italian Game","href":"/app/teoria/italiana-giuoco-piano"},{"label":"Train the repertoire","href":"/app/repertorio"}]'
  where slug = 'l2-principi-apertura';

update path_nodes set
  title = 'An opening for each color',
  description = 'A reliable system with White and a defense with Black, learned by heart.',
  activities = '[{"label":"Study the Caro-Kann","href":"/app/teoria/caro-kann"},{"label":"Train the repertoire","href":"/app/repertorio"}]'
  where slug = 'l2-apertura-per-colore';

update path_nodes set
  title = 'Lucena and Philidor',
  description = 'The two positions that govern rook endgames: winning and defending.',
  activities = '[{"label":"Lucena","href":"/app/teoria/posizione-di-lucena"},{"label":"Philidor","href":"/app/teoria/posizione-di-philidor"}]'
  where slug = 'l2-lucena-philidor';

update path_nodes set
  title = 'Structures and plans',
  description = 'Isolated pawn, open file and weak squares: read the position and form a plan.',
  activities = '[{"label":"Study the structures","href":"/app/teoria/pedone-isolano-di-donna-iqp"}]'
  where slug = 'l3-strutture-piani';

update path_nodes set
  title = 'Advanced tactics',
  description = 'Discovered attack and deflection, with a tactical rating climbing toward 1600.',
  activities = '[{"label":"Train by theme","href":"/app/tattiche"}]'
  where slug = 'l3-tattiche-avanzate';

update path_nodes set
  title = 'Analyze your games',
  description = 'Import and analyze your games: the first step to really improve.',
  activities = '[{"label":"Import a game","href":"/app/partite"}]'
  where slug = 'l3-analizza-partite';

update path_nodes set
  title = 'Structured repertoire',
  description = 'A coherent repertoire trained with high accuracy.',
  activities = '[{"label":"Train the repertoire","href":"/app/repertorio"}]'
  where slug = 'l4-repertorio-strutturato';

update path_nodes set
  title = 'Advanced endgames',
  description = 'Rook, Queen vs pawn and high-level conversion techniques.',
  activities = '[{"label":"Practice endgames","href":"/app/teoria/donna-contro-pedone"}]'
  where slug = 'l4-finali-avanzati';

update path_nodes set
  title = 'Systematic review',
  description = 'Analyze regularly: ten games reviewed with the coach.',
  activities = '[{"label":"My games","href":"/app/partite"}]'
  where slug = 'l4-revisione-sistematica';

update path_nodes set
  title = 'Targeted training',
  description = 'Loop with the coach on your weak spots, up to a club-level tactical rating (1800).',
  activities = '[{"label":"Ask the coach","href":"/app/coach"},{"label":"Adaptive challenge","href":"/app/tattiche"}]'
  where slug = 'l4-allenamento-mirato';
