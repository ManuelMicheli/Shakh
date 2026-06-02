-- 0005_repertoire_training.sql
-- Stato di allenamento (SRS) del repertorio, PER-UTENTE: i repertoire_moves
-- possono essere condivisi (gruppo, prompt 09), quindi lo stato di studio non
-- può stare sulla mossa. Più: ordine dei fratelli per ricostruire la mainline.

-- Ordine dei figli (mainline = order_index più basso). Additivo, default 0.
alter table repertoire_moves
  add column if not exists order_index int not null default 0;

create table if not exists repertoire_training (
  user_id uuid not null references profiles(id) on delete cascade,
  repertoire_move_id uuid not null references repertoire_moves(id) on delete cascade,
  attempts int not null default 0,
  successes int not null default 0,
  ease numeric not null default 2.5,
  interval_days int not null default 0,
  due_at timestamptz,
  last_seen_at timestamptz,
  primary key (user_id, repertoire_move_id)
);

create index if not exists repertoire_training_due_idx
  on repertoire_training (user_id, due_at);

alter table repertoire_training enable row level security;

-- RLS: ogni utente accede SOLO alle proprie righe di allenamento.
create policy repertoire_training_rw on repertoire_training
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
