# PROMPT 08 — Dashboard dei progressi

> **Progetto:** Shakh — piattaforma di apprendimento scacchistico
> **Prerequisiti:** prompt `00`–`07` completati. Legge: `profiles` (`current_level`, `elo_estimate`), `user_progress` dal `00`; `games`/`game_analysis` dal `03`; sintesi coach Funzione C dal `04`; `user_tactic_stats`/`user_puzzle_attempts` dal `05`; `repertoire_training` dal `06b`; progressi `endgame`/`middlegame_theme`/`traps` dal `06c`/`06d`; `user_path_progress` dal `07`.
> **Questo prompt:** la **dashboard del giocatore** — un quadro unico dei progressi, con un loop azionabile (punto debole → attività giusta). Più una **libreria di componenti di visualizzazione** riutilizzabile.
> **NON fare:** dashboard di classe/istruttore (è il `09`), GDPR/SEO/deploy (`10`).

---

## 1. Principio (per non confliggere con il `07`)

> La dashboard **legge e aggrega**, non ricalcola e non crea nuove fonti di verità sui progressi.

I progressi li producono i moduli (`user_progress`, `user_tactic_stats`, `game_analysis`, `user_path_progress`…). Il `08` li interroga e li mostra. Niente duplicazione della logica di sblocco del percorso (quella è del `07`): qui si **leggono** `current_level` e `user_path_progress` già calcolati. L'unico dato nuovo è uno **storico** temporale per i grafici (vedi §2), che è un log di visualizzazione, non una fonte di progresso.

---

## 2. Migration minima: storico del rating tattico

`user_tactic_stats` tiene solo il rating **corrente**; per il grafico dell'andamento serve la storia. Aggiungila in modo non invasivo, senza toccare il codice del `05`:

```sql
create table tactic_rating_history (
  id bigserial primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  rating int not null,
  recorded_at timestamptz not null default now()
);
create index on tactic_rating_history (user_id, recorded_at);

-- Trigger: ad ogni aggiornamento del rating, logga uno snapshot
create or replace function log_tactic_rating() returns trigger
language plpgsql security definer as $$
begin
  if (new.rating is distinct from old.rating) then
    insert into tactic_rating_history (user_id, rating) values (new.user_id, new.rating);
  end if;
  return new;
end $$;

create trigger trg_log_tactic_rating
after update on user_tactic_stats
for each row execute function log_tactic_rating();
```
RLS: l'utente legge solo il proprio storico. Lo storico parte da ora (gli utenti esistenti non hanno passato: accettabile).

---

## 3. Aggregazione dati

Crea `src/lib/progress/aggregate.ts`: funzioni server-side che leggono i dati grezzi e producono le strutture per la UI. Letture efficienti (indici già presenti), nessuna scrittura di progressi.

- **Competenza per area** (0..1): aggrega `user_progress` per macro-area — `tattica` (media pesata dei `tactic_theme`), `aperture`, `mediogioco`, `finali`, `trappole`. Pesa per numero di tentativi (poche prove = bassa confidenza).
- **Punti deboli**: i `key` con `score` basso e `attempts` sufficienti, ordinati per priorità, ciascuno con un riferimento all'attività che lo allena.
- **Statistiche di gioco**: da `game_analysis` — numero partite analizzate, accuratezza media (la stima del `03`), distribuzione blunder/mistake/inaccuracy, performance per colore e **per fase** (apertura/medio/finale: dove perdi di più).
- **Andamento rating**: serie da `tactic_rating_history`; in più, andamento dell'accuratezza delle partite nel tempo (da `game_analysis` + `games.played_at`, derivabile senza nuove tabelle).
- **Avanzamento percorso**: da `user_path_progress`/`current_level` — livelli completati, nodo corrente.

---

## 4. Libreria di visualizzazione (riutilizzabile, SVG inline)

Crea `src/components/progress/` con componenti grafici **disegnati a mano in SVG inline + Framer Motion**, **niente librerie di charting** (coerente con `EvalGraph` del `03` e con il tuo approccio "Financial Terminal"). Questi componenti sono condivisi: anche il `07` può riusarli.

- `<CompetenceRadar>` — radar/poligono delle competenze per area (o set di barre se più leggibile su mobile).
- `<TrendLine>` — grafico a linee per andamento rating/accuratezza, con punti e tooltip.
- `<DistributionBar>` — distribuzione blunder/mistake/inaccuracy (qui i colori `--eval-*` sono ammessi: comunicano un esito).
- `<StatTile>` — tessera per una metrica singola (valore + etichetta + delta).
- `<WeaknessRow>` — riga "punto debole + barra competenza + bottone azione".

Identità bianco/nero: radar e trend in grigi/contrasto; i colori solo dove rappresentano esiti/valutazioni. Tema chiaro/scuro, responsive.

---

## 5. La dashboard — `/app` (home)

La home (placeholder dal `00`, con il widget "prossimo passo" dal `07`) diventa la dashboard completa. Sezioni:

1. **Sintesi in alto**: livello nel percorso, rating tattico (con delta), streak, e la **frase di sintesi del coach** (Funzione C del `04`, già esistente — non rigenerarla qui, mostra l'ultima disponibile).
2. **Mappa competenze** (`CompetenceRadar`) sulle 5 aree.
3. **Punti deboli prioritari** (`WeaknessRow`): i 3–5 più rilevanti, **ognuno con un'azione diretta** che porta all'attività giusta — tattiche "per tema" (`05`), pratica finale (`06c`), trappole (`06d`), drill apertura (`06b`). È il loop che rende la dashboard utile invece che decorativa.
4. **Prossimo passo** (riusa il widget del `07`).
5. **Statistiche di gioco** (`StatTile` + `DistributionBar`): partite, accuratezza, dove perdi per fase/colore.
6. **Andamento** (`TrendLine`): rating tattico e accuratezza nel tempo.
7. **Attività recente**: feed leggero (ultime partite analizzate, ultimi puzzle, ultime lezioni/trappole).

---

## 6. Profilo — `/app/profilo`

Pagina di dettaglio e impostazioni:
- statistiche estese (tutte le aree, storico completo);
- impostazioni profilo: `display_name`, `username`, preferenza tema, locale;
- gestione account (cambio password via Supabase Auth);
- (predisposizione `09`) sezione "gruppi/circoli" nascosta o vuota per ora.

Attiva le voci "Dashboard" (home) e "Profilo" in sidebar.

---

## 7. Qualità e vincoli

- Solo letture/aggregazioni dei progressi; nessuna duplicazione della logica del `07`; unico dato nuovo lo storico rating (log di viz).
- Grafici in SVG inline, nessuna libreria di charting.
- Ogni punto debole ha un'azione che linka al modulo corretto (loop azionabile).
- Aggregazioni performanti; gestione del caso "dati insufficienti" (utente nuovo) con stati vuoti puliti e inviti all'azione, non grafici vuoti.
- Identità bianco/nero, colori solo per esiti/valutazioni; TypeScript strict; `next build` pulito; responsive e doppio tema.

---

## 8. Deliverable di questo prompt

1. Migration `tactic_rating_history` + trigger + RLS.
2. `src/lib/progress/aggregate.ts` — aggregazioni server-side (competenze, punti deboli, statistiche, andamenti, avanzamento percorso).
3. Libreria `src/components/progress/` (`CompetenceRadar`, `TrendLine`, `DistributionBar`, `StatTile`, `WeaknessRow`) in SVG inline, riutilizzabile.
4. Dashboard `/app` completa con loop punto-debole→azione e sintesi del coach.
5. `/app/profilo` con statistiche estese e impostazioni; voci "Dashboard" e "Profilo" attive in sidebar.
6. Stati vuoti curati per l'utente senza dati.

**Quando hai finito, fermati.** Il layer istruttore/circolo è il prompt `09`, poi GDPR/SEO/deploy il `10`.
