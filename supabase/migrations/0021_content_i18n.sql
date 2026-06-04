-- 0021_content_i18n.sql
-- ============================================================
-- Schema bilingue IT/EN per i contenuti seedati.
--
-- Contesto: la 0019_content_en.sql aveva SOVRASCRITTO in inglese le colonne
-- testuali a colonna singola (content_items.title/summary, traps.name/opening_name,
-- path_nodes.title/description/activities). Si perdeva così l'italiano originale.
--
-- Questa migrazione introduce uno schema bilingue esplicito: per ogni campo
-- visibile sulla card/pulsante esistono due colonne _it e _en. Lo strato UI
-- sceglie la colonna in base al locale attivo (NEXT_LOCALE / profiles.locale),
-- con fallback all'italiano dove l'inglese non esiste.
--
-- Backfill:
--   • _en  <- valore CORRENTE del DB (inglese, lasciato dalla 0019)
--   • _it  <- valore italiano ORIGINALE, ripreso dai seed 0004/0006/0007
--             (content_items), 0008 (traps), 0009 (path_nodes), per slug.
--
-- I CORPI delle lezioni (content_items.body, traps.body) restano SOLO in
-- italiano (sono JSON di passi/varianti): non vengono toccati qui. Per quei
-- corpi l'inglese ricade (fallback) sul testo italiano del body.
--
-- Idempotente: `add column if not exists` + UPDATE per slug, rieseguibile.
-- ============================================================

-- ============================================================
-- 1) COLONNE
-- ============================================================
alter table content_items add column if not exists title_it    text;
alter table content_items add column if not exists title_en    text;
alter table content_items add column if not exists summary_it   text;
alter table content_items add column if not exists summary_en   text;

alter table traps add column if not exists name_it          text;
alter table traps add column if not exists name_en          text;
alter table traps add column if not exists opening_name_it  text;
alter table traps add column if not exists opening_name_en  text;

alter table path_nodes add column if not exists title_it        text;
alter table path_nodes add column if not exists title_en        text;
alter table path_nodes add column if not exists description_it  text;
alter table path_nodes add column if not exists description_en  text;
alter table path_nodes add column if not exists activities_it   jsonb;
alter table path_nodes add column if not exists activities_en   jsonb;

-- ============================================================
-- 2) BACKFILL _en DAI VALORI CORRENTI (inglese, post-0019)
-- ============================================================
update content_items set title_en = title, summary_en = summary;
update traps set name_en = name, opening_name_en = opening_name;
update path_nodes set title_en = title, description_en = description, activities_en = activities;

-- ============================================================
-- 3) BACKFILL _it CON GLI ORIGINALI ITALIANI (per slug)
-- ============================================================

-- ---- content_items (da 0004 / 0006 / 0007) -------------------------------
update content_items set
  title_it   = 'Giuoco Piano — l''idea dell''Italiana',
  summary_it = 'Mini-lezione di esempio: l''Apertura Italiana e l''attacco a f7.'
  where slug = 'giuoco-piano-esempio';

update content_items set
  title_it   = 'Aperture aperte (1.e4 e5)',
  summary_it = 'Le aperture che nascono da 1.e4 e5.'
  where slug = 'aperture-aperte';

update content_items set
  title_it   = 'Difesa Caro-Kann (1.e4 c6)',
  summary_it = 'Una difesa solida e di principio contro 1.e4.'
  where slug = 'caro-kann';

update content_items set
  title_it   = 'Partita Italiana — Giuoco Piano',
  summary_it = 'Bozza da revisione: sviluppo, f7 e centro c3-d4.'
  where slug = 'italiana-giuoco-piano';

update content_items set
  title_it   = 'Caro-Kann — linea principale',
  summary_it = 'Bozza da revisione: l''alfiere attivo in f5 e la struttura tipica.'
  where slug = 'caro-kann-principale';

update content_items set
  title_it   = 'Re e pedone contro re',
  summary_it = 'Opposizione e regola del quadrato: la base di tutti i finali.'
  where slug = 're-e-pedone-contro-re';

update content_items set
  title_it   = 'Posizione di Lucena (torre)',
  summary_it = 'La tecnica del «ponte» per vincere il finale di torre con un pedone.'
  where slug = 'posizione-di-lucena';

update content_items set
  title_it   = 'Posizione di Philidor (torre)',
  summary_it = 'La difesa che patta il finale di torre quando l''avversario è in vantaggio.'
  where slug = 'posizione-di-philidor';

update content_items set
  title_it   = 'Matti elementari',
  summary_it = 'Re+Donna contro Re e Re+Torre contro Re: la tecnica per dare matto.'
  where slug = 'matti-elementari';

update content_items set
  title_it   = 'Donna contro pedone',
  summary_it = 'Quando la donna vince contro il pedone in settima — e quando è patta.'
  where slug = 'donna-contro-pedone';

update content_items set
  title_it   = 'Il pedone isolano di donna (IQP)',
  summary_it = 'Giocare con l''isolano (attività e attacco) e contro (bloccare, puntare al finale).'
  where slug = 'pedone-isolano-di-donna-iqp';

update content_items set
  title_it   = 'Colonna aperta e settima traversa',
  summary_it = 'Conquistare la colonna aperta, raddoppiare le torri, invadere in settima.'
  where slug = 'colonna-aperta-e-settima-traversa';

update content_items set
  title_it   = 'Case deboli e avamposti',
  summary_it = 'Creare e sfruttare un avamposto: il buon cavallo contro l''alfiere cattivo.'
  where slug = 'case-deboli-e-avamposti';

-- ---- traps (da 0008) -----------------------------------------------------
update traps set
  name_it = 'Matto di Légal',
  opening_name_it = 'Difesa Philidor'
  where slug = 'matto-di-legal';

update traps set
  name_it = 'Fegato Fritto (Fried Liver)',
  opening_name_it = 'Difesa dei due cavalli'
  where slug = 'fegato-fritto';

update traps set
  name_it = 'Trappola di Lasker (Albin)',
  opening_name_it = 'Controgambetto Albin'
  where slug = 'trappola-di-lasker-albin';

update traps set
  name_it = 'Gambetto dello scellino di Blackburne',
  opening_name_it = 'Partita Italiana'
  where slug = 'blackburne-shilling-gambit';

update traps set
  name_it = 'Trappola della canna da pesca',
  opening_name_it = 'Spagnola, Difesa Berlinese'
  where slug = 'fishing-pole';

update traps set
  name_it = 'Trappola dell''elefante',
  opening_name_it = 'Gambetto di donna rifiutato'
  where slug = 'elephant-trap';

update traps set
  name_it = 'Trappola di Mortimer',
  opening_name_it = 'Spagnola, Difesa di Mortimer'
  where slug = 'trappola-di-mortimer';

update traps set
  name_it = 'Trappola del Gambetto Englund',
  opening_name_it = 'Gambetto Englund'
  where slug = 'gambetto-englund';

update traps set
  name_it = 'Trappola di Kieninger (Budapest)',
  opening_name_it = 'Gambetto di Budapest'
  where slug = 'trappola-kieninger-budapest';

update traps set
  name_it = 'Difesa Damiano (la confutazione)',
  opening_name_it = 'Difesa Damiano'
  where slug = 'difesa-damiano';

-- ---- path_nodes (da 0009) ------------------------------------------------
update path_nodes set
  title_it       = 'Matti elementari',
  description_it  = 'Re+Donna e Re+Torre contro Re solo: la tecnica per dare matto con vantaggio decisivo.',
  activities_it   = '[{"label":"Studia la lezione","href":"/app/teoria/matti-elementari"}]'::jsonb
  where slug = 'l0-matti-elementari';

update path_nodes set
  title_it       = 'Primo contatto con la tattica',
  description_it  = 'Il matto in una mossa: riconoscere lo scacco matto immediato.',
  activities_it   = '[{"label":"Allenati sui puzzle","href":"/app/tattiche"}]'::jsonb
  where slug = 'l0-primo-contatto-tattica';

update path_nodes set
  title_it       = 'Re e pedone',
  description_it  = 'Il finale di Re e pedone contro Re: regola del quadrato e promozione.',
  activities_it   = '[{"label":"Studia la lezione","href":"/app/teoria/re-e-pedone-contro-re"}]'::jsonb
  where slug = 'l0-re-e-pedone';

update path_nodes set
  title_it       = 'Temi tattici fondamentali',
  description_it  = 'Forchetta, inchiodatura e infilata: i tre motivi da padroneggiare per primi.',
  activities_it   = '[{"label":"Allenati per tema","href":"/app/tattiche"}]'::jsonb
  where slug = 'l1-temi-fondamentali';

update path_nodes set
  title_it       = 'Matto in due',
  description_it  = 'Calcolo di una combinazione forzata di matto in due mosse.',
  activities_it   = '[{"label":"Allenati sui puzzle","href":"/app/tattiche"}]'::jsonb
  where slug = 'l1-matto-in-due';

update path_nodes set
  title_it       = 'Opposizione e finali di pedone',
  description_it  = 'L''opposizione decide i finali di Re e pedone: applicala fino a vincere.',
  activities_it   = '[{"label":"Pratica i finali","href":"/app/teoria/re-e-pedone-contro-re"}]'::jsonb
  where slug = 'l1-opposizione';

update path_nodes set
  title_it       = 'Rating tattico 1300',
  description_it  = 'Consolida la tattica di base fino a un rating di 1300.',
  activities_it   = '[{"label":"Sfida adattiva","href":"/app/tattiche"}]'::jsonb
  where slug = 'l1-rating-1300';

update path_nodes set
  title_it       = 'Principi d''apertura',
  description_it  = 'Centro, sviluppo e sicurezza del Re applicati a un''apertura aperta.',
  activities_it   = '[{"label":"Studia l''Italiana","href":"/app/teoria/italiana-giuoco-piano"},{"label":"Allena il repertorio","href":"/app/repertorio"}]'::jsonb
  where slug = 'l2-principi-apertura';

update path_nodes set
  title_it       = 'Un''apertura per colore',
  description_it  = 'Un sistema affidabile col Bianco e una difesa col Nero, allenati a memoria.',
  activities_it   = '[{"label":"Studia la Caro-Kann","href":"/app/teoria/caro-kann"},{"label":"Allena il repertorio","href":"/app/repertorio"}]'::jsonb
  where slug = 'l2-apertura-per-colore';

update path_nodes set
  title_it       = 'Lucena e Philidor',
  description_it  = 'Le due posizioni che governano i finali di torre: vincere e difendere.',
  activities_it   = '[{"label":"Lucena","href":"/app/teoria/posizione-di-lucena"},{"label":"Philidor","href":"/app/teoria/posizione-di-philidor"}]'::jsonb
  where slug = 'l2-lucena-philidor';

update path_nodes set
  title_it       = 'Strutture e piani',
  description_it  = 'Pedone isolano, colonna aperta e case deboli: leggere la posizione e fare un piano.',
  activities_it   = '[{"label":"Studia le strutture","href":"/app/teoria/pedone-isolano-di-donna-iqp"}]'::jsonb
  where slug = 'l3-strutture-piani';

update path_nodes set
  title_it       = 'Tattiche avanzate',
  description_it  = 'Scoperta e deviazione, con un rating tattico in salita verso 1600.',
  activities_it   = '[{"label":"Allenati per tema","href":"/app/tattiche"}]'::jsonb
  where slug = 'l3-tattiche-avanzate';

update path_nodes set
  title_it       = 'Analizza le tue partite',
  description_it  = 'Importa e analizza le tue partite: il primo passo per migliorare davvero.',
  activities_it   = '[{"label":"Importa una partita","href":"/app/partite"}]'::jsonb
  where slug = 'l3-analizza-partite';

update path_nodes set
  title_it       = 'Repertorio strutturato',
  description_it  = 'Un repertorio coerente e allenato con precisione alta.',
  activities_it   = '[{"label":"Allena il repertorio","href":"/app/repertorio"}]'::jsonb
  where slug = 'l4-repertorio-strutturato';

update path_nodes set
  title_it       = 'Finali avanzati',
  description_it  = 'Torre, Donna contro pedone e tecniche di conversione di alto livello.',
  activities_it   = '[{"label":"Pratica i finali","href":"/app/teoria/donna-contro-pedone"}]'::jsonb
  where slug = 'l4-finali-avanzati';

update path_nodes set
  title_it       = 'Revisione sistematica',
  description_it  = 'Analizza con regolarità: dieci partite riviste col coach.',
  activities_it   = '[{"label":"Le mie partite","href":"/app/partite"}]'::jsonb
  where slug = 'l4-revisione-sistematica';

update path_nodes set
  title_it       = 'Allenamento mirato',
  description_it  = 'Loop col coach sui punti deboli, fino a un rating tattico da club (1800).',
  activities_it   = '[{"label":"Chiedi al coach","href":"/app/coach"},{"label":"Sfida adattiva","href":"/app/tattiche"}]'::jsonb
  where slug = 'l4-allenamento-mirato';
