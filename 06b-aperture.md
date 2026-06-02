# PROMPT 06b — Aperture (browse, repertorio, trainer SRS)

> **Progetto:** Shakh — piattaforma di apprendimento scacchistico
> **Prerequisiti:** prompt `00`–`05` (MVP) e `06a` (infrastruttura teoria: `MoveTree`/`useMoveTree`, `VariationTree`, `LessonViewer`, `OpeningExplorer`, tipi `Lesson`) completati. Tabelle `content_items`, `repertoires`, `repertoire_moves`, `user_progress` dal `00`. Coach Funzione B dal `04`. Logica SRS già vista nel `05`.
> **Questo prompt:** il ramo **Aperture**: navigazione dell'albero ECO, **repertorio personale**, e un **opening trainer** con drill e ripetizione spaziata (modello Chessable, ma con il coach sopra). Più un contenuto-vetrina (una apertura per colore).
> **NON fare:** finali e mediogioco (`06c`), percorso guidato (`07`), dashboard (`08`).

---

## 1. Browse dell'albero ECO — `/app/teoria/aperture`

I `content_items` di tipo `opening` formano un albero via `parent_id` (famiglia → apertura → variante → sottovariante; `eco_code` valorizzato). Crea la pagina di navigazione:
- albero espandibile (es. `1.e4` → Difesa Siciliana → Najdorf → 6.Bg5…), in SAN monospace;
- ogni nodo foglia/lezione apre il `LessonViewer` del `06a` su `/app/teoria/[slug]`;
- mostra per ogni nodo il codice ECO e una riga di sintesi.
- Lettura dei soli `published = true`.

---

## 2. Repertorio personale

L'utente costruisce il proprio repertorio per colore. Usa `repertoires` (`owner_user_id`, `color`) e `repertoire_moves` (albero: `parent_move_id`, `ply`, `san`, `fen`, `annotation`, `eval`). È un `MoveTree` (06a) **persistito**.

Pagina `/app/repertorio`:
- crea/gestisci repertori (uno o più per colore: "Bianco", "Nero contro 1.e4", ecc.);
- **editor del repertorio** basato su `useMoveTree`: si aggiungono mosse muovendo sulla board, oppure con **"aggiungi al repertorio"** dall'`OpeningExplorer` (mentre si naviga una posizione) o da una lezione;
- annotazioni per nodo; salvataggio serializzando il `MoveTree` su `repertoire_moves` (e ricostruzione in caricamento);
- RLS: l'utente accede solo ai propri repertori (policy già pronta dal `00`; i repertori di gruppo restano per il `09`).

---

## 3. Migration additiva: stato SRS del repertorio

I `repertoire_moves` possono essere condivisi (gruppo), quindi lo stato di allenamento è **per-utente** in una tabella dedicata:

```sql
create table repertoire_training (
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
-- RLS: ogni utente accede solo alle proprie righe.
create index on repertoire_training (user_id, due_at);
```
Gli item allenabili sono i nodi del repertorio in cui tocca muovere **al colore dell'utente** (non le risposte avversarie).

---

## 4. Opening trainer (drill)

Modalità "allena repertorio" su `/app/repertorio/[id]/training`:
1. Si parte dalla posizione iniziale del repertorio; la board è orientata dal lato dell'utente.
2. Quando tocca **all'avversario**, l'app gioca una mossa plausibile: **se** nel repertorio è definita una risposta avversaria, la segue; **altrimenti** pesca tra le mosse più comuni dall'`OpeningExplorer` (così l'utente si allena su ciò che incontrerà davvero).
3. Quando tocca **all'utente**, deve giocare la mossa del proprio repertorio:
   - **corretta** → prosegue lungo la linea;
   - **errata** → feedback, mostra la mossa giusta, l'item è segnato fallito per l'SRS.
4. A fine linea, prossima linea del repertorio (dando priorità agli item SRS in scadenza).

**Ripetizione spaziata** (tipo SM-2, come nel `05`) su `repertoire_training`: gli item sbagliati tornano presto; quelli ricordati allungano l'intervallo. Modalità **"ripasso aperture"** che serve gli item con `due_at <= now()`.

Aggiorna `user_progress` (dimensione `opening`, `key` = slug della famiglia/variante allenata): `attempts`, `successes`, `score`.

---

## 5. Esplora + deviazione + Q&A

Dentro le lezioni e l'editor, vale tutto il `LessonViewer` del `06a`: l'utente può deviare e chiedere al coach **"perché non questa mossa?"** (Funzione B del `04`: il motore dà i numeri, il coach spiega in italiano), con l'`OpeningExplorer` che mostra le statistiche reali della posizione. Nessuna nuova logica AI.

---

## 6. Contenuto-vetrina (seed)

Per dimostrare il ramo end-to-end, crea un seed curato di **una apertura per colore** ("profondità prima di ampiezza"), come `content_items` di tipo `opening` con `body` nel formato `Lesson` del `06a`:
- **Bianco:** Giuoco Piano / Partita Italiana (`1.e4 e5 2.Cf3 Cc6 3.Ac4`), con le idee principali e 2–3 varianti.
- **Nero contro 1.e4:** Difesa Caro-Kann (`1.e4 c6`), solida e istruttiva.
(Sono scelte di partenza, adatte al passaggio principiante→club; modificabili.)

**Come costruire il seed (pipeline motore-verificata, il punto che rende la teoria affidabile):** le linee (SAN) vanno validate con `chess.js`; le mosse principali vanno prese coerenti con l'`OpeningExplorer` (ciò che si gioca davvero); le valutazioni di riferimento dal motore (`02`); le spiegazioni in italiano. **Marca questi contenuti come bozza da revisione**: sono un punto di partenza, non verità definitiva — la qualità finale richiede una revisione umana. Non inventare valutazioni o linee non verificate.

---

## 7. Qualità e vincoli

- Repertorio = `MoveTree` persistito; serializzazione/deserializzazione coerente su `repertoire_moves`.
- SRS isolato in `repertoire_training`, per-utente, con RLS.
- L'avversario nel drill segue il repertorio o l'explorer; caching dell'explorer (dal `06a`).
- Riuso del coach senza nuova logica AI; identità bianco/nero, colori solo per esito corretto/errato.
- Seed marcato come bozza, linee validate con `chess.js`.
- TypeScript strict; `next build` pulito; responsive e doppio tema.

---

## 8. Deliverable di questo prompt

1. `/app/teoria/aperture` — browse dell'albero ECO.
2. `/app/repertorio` — gestione repertori + editor basato su `useMoveTree`, con "aggiungi al repertorio" dall'explorer.
3. Migration `repertoire_training` + RLS.
4. Opening trainer/drill con avversario da repertorio/explorer e ripetizione spaziata; modalità ripasso.
5. Aggiornamento `user_progress` (opening).
6. Seed-vetrina: una apertura per colore (Italiana / Caro-Kann), costruita con la pipeline motore-verificata e marcata come bozza.

**Quando hai finito, fermati.** Finali e mediogioco sono il prompt `06c`.
