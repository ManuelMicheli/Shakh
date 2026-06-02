# PROMPT 06d — Trappole, sacrifici e astuzie

> **Progetto:** Shakh — piattaforma di apprendimento scacchistico
> **Prerequisiti:** prompt `00`–`06c` completati. Riusa: `LessonViewer`, `MoveTree`/`useMoveTree`, `OpeningExplorer`, tipi `Lesson` dal `06a`; il solver e la logica SRS dal `05`; il coach Funzione B dal `04`; il trainer aperture dal `06b`.
> **Questo prompt:** un modulo dedicato alle **trappole** scacchistiche — dalle più famose alle più di nicchia — ai **sacrifici tipici** e alle **astuzie/salvataggi** (swindle). Catalogo filtrabile + viewer interattivo + due modalità di allenamento ("tendi la trappola" / "evita la trappola").
> **NON fare:** dashboard (`08`), istruttore (`09`), deploy (`10`). I contenuti seed sono una vetrina, non l'intero catalogo.

---

## 1. Migration: modello dati delle trappole

Le trappole hanno metadati propri (chi la tende, l'esca, la punizione, quanto è famosa), quindi una tabella dedicata che però riusa il formato `Lesson` del `06a` per il rendering.

```sql
create type trap_category as enum ('opening_trap', 'gambit', 'sacrifice', 'swindle', 'tactical_motif');
create type trap_fame as enum ('famous', 'known', 'niche', 'obscure');
create type trap_side as enum ('white', 'black');

create table traps (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,                 -- es. "Matto di Légal", "Fegato Fritto"
  category trap_category not null,
  fame trap_fame not null default 'known',
  eco_code text,                      -- apertura associata, nullable
  opening_name text,                  -- es. "Difesa Philidor"
  side trap_side not null,            -- chi TENDE la trappola
  motif text[] not null default '{}', -- temi tattici: 'fork','pin','smotheredMate','sacrifice'...
  level int not null default 0,       -- difficoltà
  trigger_fen text not null,          -- posizione chiave (poco prima dell'esca)
  line_pgn text not null,             -- linea: esca + punizione (validata con chess.js)
  body jsonb not null,                -- formato Lesson (06a): passi, frecce, varianti
  published boolean not null default false,
  created_at timestamptz not null default now()
);
create index on traps (category);
create index on traps (eco_code);
create index on traps using gin (motif);

-- progresso/SRS per-utente sulle trappole
create table user_trap_progress (
  user_id uuid not null references profiles(id) on delete cascade,
  trap_id uuid not null references traps(id) on delete cascade,
  seen boolean not null default false,
  attempts int not null default 0,
  successes int not null default 0,
  ease numeric not null default 2.5,
  interval_days int not null default 0,
  due_at timestamptz,
  primary key (user_id, trap_id)
);
create index on user_trap_progress (user_id, due_at);
```
RLS: `traps` lettura pubblica dei `published`; `user_trap_progress` solo i dati dell'utente.

---

## 2. Catalogo — `/app/trappole`

Catalogo navigabile e **filtrabile**, perché "tutte le trappole famose e di nicchia" ha senso solo se si trova ciò che si cerca:
- filtro per **apertura** (ECO / nome) — "le trappole nella Siciliana";
- filtro per **categoria** (trappola d'apertura, gambetto, sacrificio, swindle, motivo tattico);
- filtro per **motivo tattico** (forchetta, inchiodatura, matto affogato, sacrificio…);
- filtro per **lato** (le tendo col Bianco / col Nero);
- filtro per **notorietà** — una manopola famose ↔ di nicchia, così l'utente può studiare le classiche o andare a caccia di chicche oscure.
- ricerca testuale per nome.

Ogni card mostra nome, apertura, categoria, motivo e livello. Attiva la voce "Trappole" in sidebar.

---

## 3. Viewer della trappola — `/app/trappole/[slug]`

Riusa il `LessonViewer` del `06a` con un taglio narrativo a tre tempi: **l'esca** (la mossa naturale ma sbagliata che l'avversario è tentato di giocare) → **lo scatto** (la punizione: il sacrificio o la tattica) → **il seguito** (perché vince). Con:
- board + `MoveTree` (varianti: cosa succede se l'avversario *non* casca);
- **frequenza reale via `OpeningExplorer`**: mostra quanto spesso, nelle partite vere, l'avversario gioca davvero la mossa-esca. È un dato che un libro di trappole non ti dà — distingue la trappola che scatta di continuo da quella da manuale che nessuno fa più;
- **Q&A col coach** (Funzione B del `04`): *"perché non posso semplicemente prendere il pezzo?"* → motore + spiegazione in italiano;
- al primo accesso, segna `user_trap_progress.seen = true`.

---

## 4. Allenamento (due modalità)

Riusa il pattern del `<PuzzleSolver>` (05) sul `MoveTree`:

1. **Tendi la trappola** — dal lato di chi la tende: l'app gioca la mossa-esca dell'avversario, **tu devi trovare la punizione** (il sacrificio/la tattica). Verifica contro la linea registrata (tolleranza matto immediato equivalente, come nel `05`).
2. **Evita la trappola** — dal lato di chi rischia di caderci: ti viene mostrata la posizione dell'esca e **devi trovare la mossa sicura** che *non* abbocca. Didatticamente è il pezzo più prezioso: non serve solo conoscere le trappole, serve non caderci.

Entrambe aggiornano `user_trap_progress` (attempts/successes) e usano **ripetizione spaziata** (tipo SM-2, come nel `05`): le trappole sbagliate tornano. Modalità **"ripasso trappole"** che serve quelle con `due_at <= now()`. Feedback con i colori esito (eccezione funzionale), resto bianco/nero.

---

## 5. Collegamenti con il resto

- **Trainer aperture (`06b`)**: se la linea del repertorio che l'utente sta allenando contiene una trappola nota (match su `trigger_fen`/ECO), segnalala con un rimando ("attento: qui esiste la trappola X").
- **Tattiche (`05`)**: i `motif` delle trappole collegano alla modalità "per tema" dei puzzle.
- **Percorso (`07`)**: predisponi un requisito `{ type: 'traps', count, fame }` (estensione dell'engine dei requisiti) così un nodo del percorso possa chiedere "studia 5 trappole famose"; aggiungilo al valutatore esistente senza rifarlo.
- **Coach (`04`)**: facoltativo, nessuna nuova logica — se nelle partite analizzate emerge un pattern da trappola, è già coperto dal commento esistente.

---

## 6. Seed-vetrina (bozza da revisione)

Crea ~10 trappole famose come `traps` pubblicate, distribuite tra le categorie, con `body` in formato `Lesson`. Esempi adatti: Matto di Légal, Fegato Fritto (Fried Liver), trappola di Lasker, trappola dell'Arca di Noè (Noah's Ark), trappola del Gambetto Englund, Blackburne Shilling Gambit, Fishing Pole, Elephant Trap, trappola di Mortimer, e un sacrificio tipico come il **Greek Gift** (Axh7+).

**Pipeline e onestà sui contenuti:** le linee (SAN/PGN) vanno **validate con `chess.js`**, la frequenza reale presa dall'`OpeningExplorer`, le valutazioni dal motore (`02`); le spiegazioni in italiano sono **bozze da revisione**, non verità definitiva. La raccolta completa ("tutte" le trappole, incluse quelle di nicchia) è lavoro di curation continuo: questo modulo fornisce l'infrastruttura per aggiungerle, non pretende di contenerle tutte da subito. Niente linee o valutazioni inventate.

---

## 7. Qualità e vincoli

- Linee validate con `chess.js`; verifica delle soluzioni in UCI con tolleranza matto equivalente.
- Frequenza reale dall'explorer con caching (dal `06a`); coach riusato senza nuova logica AI.
- SRS isolato in `user_trap_progress`, per-utente, RLS attiva.
- Catalogo filtrabile performante (indici su categoria/ECO/motif).
- Seed marcato come bozza; identità bianco/nero, colori solo per gli esiti.
- TypeScript strict; `next build` pulito; responsive e doppio tema.

---

## 8. Deliverable di questo prompt

1. Migration `traps` + `user_trap_progress` (con enum) + RLS.
2. `/app/trappole` — catalogo filtrabile (apertura, categoria, motivo, lato, notorietà, ricerca); voce "Trappole" in sidebar.
3. `/app/trappole/[slug]` — viewer narrativo (esca → scatto → seguito) con frequenza reale dall'explorer e Q&A del coach.
4. Due modalità di allenamento ("tendi" / "evita") con ripetizione spaziata e modalità ripasso.
5. Collegamenti: segnalazione nel trainer aperture, rimando ai temi tattici, requisito `traps` aggiunto all'engine del percorso.
6. Seed-vetrina di ~10 trappole famose, costruite con la pipeline e marcate come bozza.

**Quando hai finito, fermati.** Resta la dashboard dei progressi (`08`), poi il layer istruttore/circolo (`09`) e GDPR/SEO/deploy (`10`).
