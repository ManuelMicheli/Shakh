-- ============================================================
-- Shakh — abilita pg_cron e schedula la rotazione mensile del Campionato.
--
-- Il blocco guardato in 0025 schedula i job SOLO se pg_cron è già presente; su
-- un DB nuovo l'estensione non c'è ancora a quel punto, quindi qui l'abilitiamo
-- esplicitamente e (ri)creiamo gli scheduling. `cron.schedule` fa upsert per
-- jobname → idempotente.
-- ============================================================
create extension if not exists pg_cron;

-- Chiudi ogni notte le stagioni attive scadute.
select cron.schedule(
  'champ-close-expired', '5 0 * * *',
  $cron$
    do $inner$
    declare s record;
    begin
      for s in select id from championship_seasons
               where status = 'active' and ends_at is not null and ends_at <= now() loop
        perform public.champ_close_season(s.id);
      end loop;
    end $inner$;
  $cron$
);

-- Il 1° del mese: apri la nuova stagione (finestra iscrizioni).
select cron.schedule(
  'champ-open-monthly', '10 0 1 * *',
  $cron$
    select public.champ_open_season(
      to_char(now(), 'YYYY-MM'),
      to_char(now(), 'TMMonth YYYY'),
      '10+5',
      (date_trunc('month', now()) + interval '1 month' - interval '1 second')
    );
  $cron$
);

-- Il 4° del mese: chiusa la finestra iscrizioni, seeding bilanciato → 'active'.
select cron.schedule(
  'champ-seed-monthly', '10 0 4 * *',
  $cron$
    do $inner$
    declare s record;
    begin
      for s in select id from championship_seasons where status = 'open' loop
        perform public.champ_seed_season(s.id);
      end loop;
    end $inner$;
  $cron$
);
