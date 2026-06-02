# PROMPT 05 — Tattiche (puzzle + ripetizione spaziata)

> **Progetto:** Shakh — piattaforma di apprendimento scacchistico
> **Prerequisiti:** prompt `00`–`04` completati. In particolare: tabelle `puzzles` e `user_puzzle_attempts` (con campi SRS `ease`, `interval_days`, `due_at`) e `user_progress` dal `00`; `ChessBoard` con `mode='puzzle'` e `useChessGame` dal `01`; `user_progress` alimentato dal coach `04`.
> **Questo prompt:** chiude l'MVP. Costruisce l'allenamento tattico: import del dataset puzzle di Lichess, **solver adattivo** basato sul rating, **ripetizione spaziata** dei puzzle sbagliati, modalità per tema e a tempo. Aggiorna i progressi granulari per tema tattico.
> **NON fare:** teoria/aperture/finali (è il `06`), percorso guidato (`07`), dashboard completa (`08`), funzioni da istruttore (`09`).

---

## 1. Dataset puzzle (Lichess, open, CC0)

Lichess pubblica gratuitamente il suo database di puzzle (licenza CC0, milioni di puzzle). Formato CSV con colonne:
`PuzzleId, FEN, Moves, Rating, RatingDeviation, Popularity, NbPlays, Themes, GameUrl, OpeningTags`.

Crea uno **script di import** (`scripts/import-puzzles.ts`) che mappa il CSV sulla tabella `puzzles`:
- `external_id` ← `PuzzleId`
- `fen` ← `FEN`
- `moves` ← `Moves` (mosse in UCI, separate da spazio)
- `rating` ← `Rating`
- `themes` ← `Themes` (stringa spazio-separata → `text[]`)
- `popularity` ← `Popularity`

Lo script deve essere **configurabile** per importare un **subset** (il CSV completo è enorme): filtri per range di rating e popolarità minima, e un limite. Per l'MVP basta un subset ben distribuito su tutte le fasce di rating e i temi principali. Import idempotente (upsert su `external_id`).

> **Convenzione Lichess da rispettare (errore classico):** la `FEN` è la posizione **prima** della prima mossa di `Moves`. La **prima mossa di `Moves` è giocata automaticamente** dall'avversario (è la mossa che "innesca" il puzzle); il solver inizia dalla **seconda** mossa. Se sbagli questo, ogni puzzle parte dal lato sbagliato. Implementa il caricamento così: applica la prima mossa con animazione, poi tocca all'utente.

I **temi** Lichess sono standard (`fork`, `pin`, `skewer`, `mateIn2`, `sacrifice`, `endgame`, `discoveredAttack`, …): usali direttamente come tassonomia tattica.

---

## 2. Migration additiva: statistiche tattiche utente

Aggiungi una migration con la tabella del rating/streak tattico (non sporcare `profiles`):

```sql
create table user_tactic_stats (
  user_id uuid primary key references profiles(id) on delete cascade,
  rating int not null default 1200,        -- rating tattico del solver
  rating_deviation int not null default 350,
  puzzles_solved int not null default 0,
  puzzles_failed int not null default 0,
  current_streak int not null default 0,
  best_streak int not null default 0,
  updated_at timestamptz not null default now()
);
-- RLS: l'utente accede solo alla propria riga; istruttore (owner del gruppo) in lettura.
```
Crea la riga al primo accesso alle tattiche se non esiste.

---

## 3. Solver del puzzle (riusa `ChessBoard`)

Componente `<PuzzleSolver>` che riusa `ChessBoard` in `mode='puzzle'` e `useChessGame`:

1. Carica `fen`, applica automaticamente la prima mossa di `moves` (animata), imposta l'orientamento dal lato che deve risolvere.
2. L'utente muove; confronta in **UCI** con la mossa attesa della soluzione.
   - **Corretta** → applica la mossa, poi applica automaticamente la **risposta** dell'avversario (mossa successiva della soluzione) e prosegui finché la linea è completa → **puzzle risolto**.
   - **Errata** → feedback negativo; consenti di **ritentare** la posizione, ma il puzzle conta come **fallito** ai fini di rating/SRS (anche se poi lo completa).
3. Gestisci promozioni e fine linea (matto o ultima mossa = risolto).

> **Mosse alternative:** la soluzione di riferimento è quella registrata. Come unica tolleranza, accetta una mossa diversa **solo** se dà **scacco matto immediato** equivalente (caso comune nei matti). Tutto il resto va confrontato con la linea registrata. Niente logiche più sofisticate ora.

Feedback visivo: usa i colori semantici `--eval-best` (corretto) e `--eval-blunder` (errato) — è la stessa **eccezione funzionale** dell'analisi, ammessa perché comunica un esito, non decora. Resto dell'interfaccia in bianco/nero.

**Suggerimento (hint) opzionale:** un pulsante che evidenzia il pezzo da muovere. Se usato, il puzzle è marcato "aiutato" e **non** modifica il rating (ma può comunque entrare nell'SRS). Tienilo discreto.

---

## 4. Difficoltà adattiva (rating)

Il solver ha un rating; i puzzle hanno un rating. Servi puzzle vicini al rating dell'utente e aggiorna il rating dopo ogni tentativo con un **aggiornamento tipo Elo/Glicko semplificato**:
- successo contro puzzle di rating più alto → guadagno maggiore; fallimento contro rating più basso → perdita maggiore;
- aggiorna `user_tactic_stats` (rating, solved/failed, streak).

Selezione del prossimo puzzle (query efficiente, con indici su `rating` e `themes`):
- range attorno al rating utente (es. ±100, allargabile se pochi risultati);
- escludi i puzzle già visti di recente dall'utente;
- ordinamento con componente casuale per varietà.

---

## 5. Ripetizione spaziata (SRS) sui puzzle sbagliati

Usa i campi SRS di `user_puzzle_attempts`. Algoritmo **tipo SM-2 semplificato**:
- puzzle **fallito** → schedulato per tornare presto (`interval_days` piccolo, `due_at` ravvicinato);
- alla ripetizione, se **risolto** → `ease` e `interval_days` crescono (intervallo che si allunga); se di nuovo fallito → si accorcia.
- I puzzle risolti correttamente al primo colpo nell'allenamento adattivo **non** entrano necessariamente nell'SRS (l'SRS serve a ri-vedere ciò che non sai).

Modalità **Ripasso**: serve i puzzle con `due_at <= now()` per quell'utente, in ordine di scadenza.

---

## 6. Modalità di allenamento (pagina `/app/tattiche`)

Hub con le modalità:

1. **Adattivo** — flusso continuo di puzzle al tuo rating; aggiorna rating e streak.
2. **Per tema** — scegli un tema (fork, inchiodatura, finale, matto in 2…) e alleni quello. Predisponi un parametro `theme` in ingresso, così il **coach (`04`)** o la **dashboard (`08`)** potranno linkare direttamente *"allenati sui finali"* quando rilevano quel punto debole.
3. **Ripasso** — i puzzle SRS in scadenza.
4. **Sfida a tempo** — modalità a tempo (es. 3 minuti) con difficoltà crescente: conta quanti ne risolvi, salva il record (`best_streak`/punteggio). È la componente di gamification. (Nome generico "Sfida a tempo", non usare nomi brandizzati di altre piattaforme.)

Ogni modalità mostra: posizione, lato al tratto, streak/punteggio corrente, feedback, e il passaggio fluido al puzzle successivo.

---

## 7. Aggiornamento dei progressi granulari

Dopo ogni puzzle, aggiorna `user_progress` per **ogni tema** del puzzle (dimensione `tactic_theme`, `key` = tema): incrementa `attempts`, e `successes` se risolto senza aiuto/errore; ricalcola `score` (competenza 0..1). È ciò che alimenta sia il coach sia la futura dashboard, e permette di sapere *su quali temi tattici l'utente è debole*.

Registra ogni tentativo in `user_puzzle_attempts` (success, time_ms, campi SRS).

---

## 8. Qualità e vincoli

- Rispetta la convenzione Lichess sulla prima mossa automatica.
- Selezione puzzle performante (indici, niente full scan); import idempotente e configurabile a subset.
- Confronto mosse in UCI; unica tolleranza il matto immediato equivalente.
- Colori solo per l'esito corretto/errato (eccezione funzionale); resto bianco/nero.
- RLS su `user_tactic_stats` e `user_puzzle_attempts`; l'utente vede solo i propri dati.
- TypeScript strict; `next build` pulito; responsive e tema chiaro/scuro; navigazione fluida tra puzzle.

---

## 9. Deliverable di questo prompt

1. `scripts/import-puzzles.ts` — import configurabile del dataset Lichess in `puzzles`.
2. Migration `user_tactic_stats` + RLS.
3. `<PuzzleSolver>` che riusa `ChessBoard` (prima mossa automatica, verifica soluzione, promozioni, hint opzionale).
4. Rating adattivo (aggiornamento Elo/Glicko semplificato) e selezione puzzle al livello.
5. SRS tipo SM-2 sui puzzle sbagliati + modalità Ripasso.
6. Pagina `/app/tattiche` con le 4 modalità (Adattivo, Per tema, Ripasso, Sfida a tempo); voce "Tattiche" attivata in sidebar.
7. Aggiornamento di `user_progress` (tactic_theme) e `user_puzzle_attempts` ad ogni tentativo.

**Quando hai finito, fermati.** Con questo l'MVP (`00`–`05`) è completo: fondamenta, scacchiera, motore, analisi delle partite, coach AI e tattiche.
