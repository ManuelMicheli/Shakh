-- ============================================================
-- Shakh — Prompt 07: Percorso guidato (curriculum + progresso + completamenti)
-- Curriculum seedato e condiviso (path_nodes), progresso per-utente
-- (user_path_progress) e completamento lezioni (content_completions).
-- I requisiti LEGGONO i progressi dei moduli esistenti (05/06/03/04):
-- qui non si duplica alcun progresso, si aggiunge solo lo stato sul percorso.
-- ============================================================

create type path_node_status as enum ('locked', 'available', 'in_progress', 'completed');

-- ------------------------------------------------------------
-- Curriculum: i nodi del percorso (seed condiviso, contenuto)
-- ------------------------------------------------------------
create table path_nodes (
  id uuid primary key default gen_random_uuid(),
  level int not null,                            -- 0..N (macro-livello)
  slug text unique not null,
  title text not null,
  description text,
  order_index int not null default 0,
  prerequisites text[] not null default '{}',   -- slug di altri path_nodes
  requirements jsonb not null default '[]',      -- array di criteri verificabili (vedi src/lib/path/requirements.ts)
  activities jsonb not null default '[]',        -- array di { label, href } verso il modulo collegato
  published boolean not null default true,
  created_at timestamptz not null default now()
);
create index on path_nodes (level, order_index);

-- ------------------------------------------------------------
-- Progresso dell'utente sui nodi
-- ------------------------------------------------------------
create table user_path_progress (
  user_id uuid not null references profiles(id) on delete cascade,
  node_id uuid not null references path_nodes(id) on delete cascade,
  status path_node_status not null default 'locked',
  progress numeric not null default 0,           -- 0..1, avanzamento verso il completamento
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, node_id)
);
create index on user_path_progress (user_id, status);

create trigger user_path_progress_set_updated_at
  before update on user_path_progress
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- Completamento lezioni: aggancia il LessonViewer (06a).
-- Una riga quando l'utente completa i passi di una lezione.
-- ------------------------------------------------------------
create table content_completions (
  user_id uuid not null references profiles(id) on delete cascade,
  content_item_id uuid not null references content_items(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, content_item_id)
);
create index on content_completions (user_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table path_nodes           enable row level security;
alter table user_path_progress   enable row level security;
alter table content_completions  enable row level security;

-- path_nodes: contenuto curricolare, lettura pubblica dei published;
-- scrittura solo admin/instructor (come content_items).
create policy path_nodes_select_published on path_nodes
  for select using (
    published = true
    or exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role in ('admin', 'instructor')
    )
  );
create policy path_nodes_staff_write on path_nodes
  for all using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role in ('admin', 'instructor')
    )
  ) with check (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role in ('admin', 'instructor')
    )
  );

-- user_path_progress: proprio accesso pieno; istruttore sola lettura (predisp. 09).
create policy upp_select on user_path_progress
  for select using (
    user_id = auth.uid() or public.is_group_instructor_of(user_id)
  );
create policy upp_write_own on user_path_progress
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- content_completions: idem.
create policy cc_select on content_completions
  for select using (
    user_id = auth.uid() or public.is_group_instructor_of(user_id)
  );
create policy cc_write_own on content_completions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================
-- SEED CURRICULUM (Livelli 0–4) — BOZZA DI DESIGN DIDATTICO
-- Punto di partenza modificabile, non verità definitiva (come i contenuti
-- teorici). I requisiti puntano a contenuti/temi già seedati (05/06b/06c)
-- così il percorso è realmente percorribile da subito.
-- ============================================================
insert into path_nodes (level, slug, title, description, order_index, prerequisites, requirements, activities) values

-- ---------- Livello 0 — Fondamenta ----------
(0, 'l0-matti-elementari', 'Matti elementari',
 'Re+Donna e Re+Torre contro Re solo: la tecnica per dare matto con vantaggio decisivo.',
 0, '{}',
 '[{"type":"lesson","slug":"matti-elementari"},{"type":"endgame_practice","key":"kq_vs_k"}]',
 '[{"label":"Studia la lezione","href":"/app/teoria/matti-elementari"}]'),

(0, 'l0-primo-contatto-tattica', 'Primo contatto con la tattica',
 'Il matto in una mossa: riconoscere lo scacco matto immediato.',
 1, '{}',
 '[{"type":"puzzles_theme","theme":"mateIn1","count":5,"minSuccessRate":0.6}]',
 '[{"label":"Allenati sui puzzle","href":"/app/tattiche"}]'),

(0, 'l0-re-e-pedone', 'Re e pedone',
 'Il finale di Re e pedone contro Re: regola del quadrato e promozione.',
 2, '{l0-matti-elementari}',
 '[{"type":"lesson","slug":"re-e-pedone-contro-re"},{"type":"endgame_practice","key":"kp_vs_k"}]',
 '[{"label":"Studia la lezione","href":"/app/teoria/re-e-pedone-contro-re"}]'),

-- ---------- Livello 1 — Tattica di base ----------
(1, 'l1-temi-fondamentali', 'Temi tattici fondamentali',
 'Forchetta, inchiodatura e infilata: i tre motivi da padroneggiare per primi.',
 0, '{l0-primo-contatto-tattica}',
 '[{"type":"puzzles_theme","theme":"fork","count":6,"minSuccessRate":0.6},{"type":"puzzles_theme","theme":"pin","count":6,"minSuccessRate":0.6},{"type":"puzzles_theme","theme":"skewer","count":6,"minSuccessRate":0.6}]',
 '[{"label":"Allenati per tema","href":"/app/tattiche"}]'),

(1, 'l1-matto-in-due', 'Matto in due',
 'Calcolo di una combinazione forzata di matto in due mosse.',
 1, '{l0-primo-contatto-tattica}',
 '[{"type":"puzzles_theme","theme":"mateIn2","count":6,"minSuccessRate":0.6}]',
 '[{"label":"Allenati sui puzzle","href":"/app/tattiche"}]'),

(1, 'l1-opposizione', 'Opposizione e finali di pedone',
 'L''opposizione decide i finali di Re e pedone: applicala fino a vincere.',
 2, '{l0-re-e-pedone}',
 '[{"type":"endgame_practice","key":"kp_vs_k"},{"type":"lesson","slug":"donna-contro-pedone"}]',
 '[{"label":"Pratica i finali","href":"/app/teoria/re-e-pedone-contro-re"}]'),

(1, 'l1-rating-1300', 'Rating tattico 1300',
 'Consolida la tattica di base fino a un rating di 1300.',
 3, '{l1-temi-fondamentali}',
 '[{"type":"tactic_rating","min":1300}]',
 '[{"label":"Sfida adattiva","href":"/app/tattiche"}]'),

-- ---------- Livello 2 — Apertura + finali chiave ----------
(2, 'l2-principi-apertura', 'Principi d''apertura',
 'Centro, sviluppo e sicurezza del Re applicati a un''apertura aperta.',
 0, '{l1-temi-fondamentali}',
 '[{"type":"lesson","slug":"italiana-giuoco-piano"},{"type":"opening_drill","minAccuracy":0.7}]',
 '[{"label":"Studia l''Italiana","href":"/app/teoria/italiana-giuoco-piano"},{"label":"Allena il repertorio","href":"/app/repertorio"}]'),

(2, 'l2-apertura-per-colore', 'Un''apertura per colore',
 'Un sistema affidabile col Bianco e una difesa col Nero, allenati a memoria.',
 1, '{l2-principi-apertura}',
 '[{"type":"lesson","slug":"caro-kann"},{"type":"opening_drill","minAccuracy":0.75}]',
 '[{"label":"Studia la Caro-Kann","href":"/app/teoria/caro-kann"},{"label":"Allena il repertorio","href":"/app/repertorio"}]'),

(2, 'l2-lucena-philidor', 'Lucena e Philidor',
 'Le due posizioni che governano i finali di torre: vincere e difendere.',
 2, '{l1-opposizione}',
 '[{"type":"lesson","slug":"posizione-di-lucena"},{"type":"endgame_practice","key":"lucena"},{"type":"lesson","slug":"posizione-di-philidor"},{"type":"endgame_practice","key":"philidor"}]',
 '[{"label":"Lucena","href":"/app/teoria/posizione-di-lucena"},{"label":"Philidor","href":"/app/teoria/posizione-di-philidor"}]'),

-- ---------- Livello 3 — Mediogioco ----------
(3, 'l3-strutture-piani', 'Strutture e piani',
 'Pedone isolano, colonna aperta e case deboli: leggere la posizione e fare un piano.',
 0, '{l2-principi-apertura}',
 '[{"type":"lesson","slug":"pedone-isolano-di-donna-iqp"},{"type":"lesson","slug":"colonna-aperta-e-settima-traversa"},{"type":"lesson","slug":"case-deboli-e-avamposti"},{"type":"middlegame_theme","key":"isolani_dama","minSuccessRate":0.6}]',
 '[{"label":"Studia le strutture","href":"/app/teoria/pedone-isolano-di-donna-iqp"}]'),

(3, 'l3-tattiche-avanzate', 'Tattiche avanzate',
 'Scoperta e deviazione, con un rating tattico in salita verso 1600.',
 1, '{l1-rating-1300}',
 '[{"type":"puzzles_theme","theme":"discoveredAttack","count":8,"minSuccessRate":0.55},{"type":"puzzles_theme","theme":"deflection","count":8,"minSuccessRate":0.55},{"type":"tactic_rating","min":1600}]',
 '[{"label":"Allenati per tema","href":"/app/tattiche"}]'),

(3, 'l3-analizza-partite', 'Analizza le tue partite',
 'Importa e analizza le tue partite: il primo passo per migliorare davvero.',
 2, '{l2-principi-apertura}',
 '[{"type":"analyze_games","count":3}]',
 '[{"label":"Importa una partita","href":"/app/partite"}]'),

-- ---------- Livello 4 — Verso il club ----------
(4, 'l4-repertorio-strutturato', 'Repertorio strutturato',
 'Un repertorio coerente e allenato con precisione alta.',
 0, '{l2-apertura-per-colore}',
 '[{"type":"opening_drill","minAccuracy":0.8}]',
 '[{"label":"Allena il repertorio","href":"/app/repertorio"}]'),

(4, 'l4-finali-avanzati', 'Finali avanzati',
 'Torre, Donna contro pedone e tecniche di conversione di alto livello.',
 1, '{l2-lucena-philidor}',
 '[{"type":"endgame_practice","key":"lucena"},{"type":"endgame_practice","key":"philidor"},{"type":"endgame_practice","key":"q_vs_p"}]',
 '[{"label":"Pratica i finali","href":"/app/teoria/donna-contro-pedone"}]'),

(4, 'l4-revisione-sistematica', 'Revisione sistematica',
 'Analizza con regolarità: dieci partite riviste col coach.',
 2, '{l3-analizza-partite}',
 '[{"type":"analyze_games","count":10}]',
 '[{"label":"Le mie partite","href":"/app/partite"}]'),

(4, 'l4-allenamento-mirato', 'Allenamento mirato',
 'Loop col coach sui punti deboli, fino a un rating tattico da club (1800).',
 3, '{l3-tattiche-avanzate}',
 '[{"type":"tactic_rating","min":1800}]',
 '[{"label":"Chiedi al coach","href":"/app/coach"},{"label":"Sfida adattiva","href":"/app/tattiche"}]');
