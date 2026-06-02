# PROMPT 07 — Percorso guidato

> **Progetto:** Shakh — piattaforma di apprendimento scacchistico
> **Prerequisiti:** prompt `00`–`06c` completati. Usa: `profiles.current_level`/`onboarding_completed`/`elo_estimate`, `user_progress` dal `00`; il solver puzzle e `user_tactic_stats` dal `05`; l'analisi partite dal `03`; la sintesi pattern del coach (Funzione C) dal `04`; `LessonViewer`, pratica finali, opening drill dal `06a`/`b`/`c`.
> **Questo prompt:** lega tutti i moduli in un percorso **da principiante assoluto a giocatore di club**. Tre pezzi: (1) **diagnostico iniziale** che stima il livello, (2) **mappa a livelli** (skill tree) con sblocco progressivo, (3) **guida adattiva** che all'inizio indica il prossimo passo e via via lascia spazio all'autonomia.
> **NON fare:** dashboard completa dei progressi (`08`), layer istruttore/circolo (`09`), GDPR/SEO/deploy (`10`).

---

## 1. Migration: curriculum e progresso sul percorso

Due tabelle: il **curriculum** (contenuto seedato, condiviso) e il **progresso per-utente**. Più una tabella leggera per il completamento delle lezioni, che serve qui.

```sql
create type path_node_status as enum ('locked', 'available', 'in_progress', 'completed');

-- Curriculum: i nodi del percorso (seed condiviso)
create table path_nodes (
  id uuid primary key default gen_random_uuid(),
  level int not null,                 -- 0..N (macro-livello)
  slug text unique not null,
  title text not null,
  description text,
  order_index int not null default 0,
  prerequisites text[] not null default '{}',  -- slug di altri path_nodes
  requirements jsonb not null,        -- criteri di completamento (vedi §4)
  published boolean not null default true
);

-- Progresso dell'utente sui nodi
create table user_path_progress (
  user_id uuid not null references profiles(id) on delete cascade,
  node_id uuid not null references path_nodes(id) on delete cascade,
  status path_node_status not null default 'locked',
  progress numeric not null default 0,  -- 0..1, avanzamento verso il completamento
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, node_id)
);

-- Completamento lezioni (serve al percorso; aggancia il LessonViewer del 06a)
create table content_completions (
  user_id uuid not null references profiles(id) on delete cascade,
  content_item_id uuid not null references content_items(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, content_item_id)
);
```
RLS: `path_nodes` lettura pubblica dei `published`; `user_path_progress` e `content_completions` solo i dati dell'utente (istruttore in lettura per i membri, predisposto per il `09`).

> Aggancia il `LessonViewer` (06a) perché, completati i `steps` di una lezione, registri una riga in `content_completions`. È l'unico ritocco a un modulo esistente richiesto qui.

---

## 2. Diagnostico iniziale (onboarding)

Implementa `/app/onboarding` (era un placeholder dal `00`), mostrato quando `onboarding_completed = false`. Obiettivo: stimare il livello e posizionare l'utente nel percorso, senza essere lungo.

Passi:
1. **Autovalutazione** (poche domande a scelta): "Conosci come muovono i pezzi?", "Giochi online? Con che rating circa?", "Da quanto giochi?".
2. **Mini-test tattico**: 5–8 puzzle calibrati (riusa il `<PuzzleSolver>` del `05`) a difficoltà crescente, per stimare un rating tattico di partenza.
3. **Opzionale**: "Hai una partita da analizzare?" → import + analisi (riusa il `03`) per un segnale sul livello reale.

Output: imposta `profiles.elo_estimate`, inizializza `user_tactic_stats.rating`, calcola il **livello di partenza** nel percorso e segna `onboarding_completed = true`. Un principiante assoluto parte dal Livello 0; chi dichiara/dimostra livello da club entra più avanti (i nodi dei fondamentali risultano già `completed`, così non lo si annoia con cose che sa).

Chiudi con un tour brevissimo (3 schermate) e atterra sul `/app/percorso`.

---

## 3. Mappa del percorso — `/app/percorso`

Visualizza lo skill tree: i nodi per livello, con stato (bloccato / disponibile / in corso / completato) e barra di avanzamento per i nodi in corso. Un nodo è **available** quando tutti i `prerequisites` sono `completed`; diventa **completed** quando i suoi `requirements` sono soddisfatti (vedi §4).

- Identità bianco/nero; lo stato dei nodi con grigi/contrasto e icone, non colori (i colori restano riservati a esito/valutazione).
- Click su un nodo disponibile → apre l'attività collegata nel modulo giusto (una lezione, una serie di puzzle a tema, una pratica di finale, un drill d'apertura, l'analisi di una partita).
- Attiva la voce "Percorso" in sidebar.

---

## 4. Engine dei requisiti (il cuore dello sblocco)

Crea `src/lib/path/requirements.ts`: un valutatore che, dato un nodo e l'utente, calcola `progress` (0..1) e se è `completed`, **leggendo i dati già esistenti** nei moduli. Definisci un piccolo schema di tipi di requisito verificabili (in `requirements` jsonb):

- `{ type: 'lesson', slug }` → completata se c'è `content_completions` per quella lezione.
- `{ type: 'puzzles_theme', theme, count, minSuccessRate }` → legge `user_progress`/`user_puzzle_attempts` per quel tema.
- `{ type: 'endgame_practice', key }` → finale convertito con successo contro la tablebase (segnale dal `06c`).
- `{ type: 'opening_drill', slug|repertoire, minAccuracy }` → drill d'apertura superato (dal `06b`).
- `{ type: 'analyze_games', count }` → numero di partite analizzate (dal `03`).
- `{ type: 'tactic_rating', min }` → `user_tactic_stats.rating ≥ min`.
- Composizione: un nodo può richiedere **più** requisiti (tutti soddisfatti = completato; `progress` = media pesata).

Il calcolo gira lato server (server action) ed è **idempotente**: ricomputa lo stato dei nodi dell'utente su richiesta e quando completa un'attività rilevante, aggiornando `user_path_progress` e, al salire di livello, `profiles.current_level`. Niente duplicazione di dati: i requisiti **leggono** i progressi dei moduli, non li ricreano.

---

## 5. Guida adattiva → autonomia

Il prodotto deve **guidare all'inizio e poi lasciare andare**, come da visione.

- **"Prossimo passo"**: un widget che indica la prossima attività consigliata. Ai livelli bassi (0–2) è il prossimo nodo disponibile del curriculum: guida quasi su binario.
- **Transizione all'autonomia**: dai livelli intermedi in poi (≈ dal livello 3, o quando `onboarding`+fondamentali sono completati), il "prossimo passo" smette di essere un binario e diventa una **raccomandazione basata sui dati**: usa i `focusAreas` della sintesi del coach (`04`, Funzione C) e i punti deboli in `user_progress` per proporre attività mirate (es. *"i tuoi finali di torre sono deboli: 15 minuti di pratica"*), affiancando il curriculum invece di sostituirlo. L'interfaccia mette in evidenza la **modalità libera** (esplora teoria, allena dove vuoi), col percorso che resta come riferimento, non come gabbia.
- Inserisci un piccolo **widget "prossimo passo"** anche nella home `/app` (la dashboard completa è il `08`; qui basta il widget).

> Niente nuova logica AI: riusa la sintesi della Funzione C del `04` e i dati di `user_progress`. Le raccomandazioni sono guidate dai dati, l'eventuale frase motivazionale dalla sintesi già esistente.

---

## 6. Curriculum seed (bozza didattica da rivedere)

Seed di `path_nodes` con una progressione concreta principiante→club. È una **bozza di design didattico**, modificabile (come i contenuti teorici: un punto di partenza, non verità definitiva):

- **Livello 0 — Fondamenta:** movimento dei pezzi e regole, scacco/matto/patta, notazione, valore dei pezzi, matti elementari (Re+Donna, Re+Torre), principi d'apertura in pillole.
- **Livello 1 — Tattica di base:** forchetta, inchiodatura, infilata, matto in 1–2 (puzzle a tema dal `05`); finale Re e pedone / opposizione (dal `06c`).
- **Livello 2 — Apertura + finali chiave:** principi d'apertura applicati, una apertura per colore (dal `06b`), Lucena e Philidor (dal `06c`).
- **Livello 3 — Mediogioco:** piani e strutture (IQP, colonna aperta, case deboli — dal `06c`), tattiche più difficili, prime analisi delle proprie partite (`03`/`04`).
- **Livello 4 — Verso il club:** repertorio strutturato, finali avanzati, revisione sistematica delle proprie partite, allenamento mirato sui punti deboli (loop col coach).

Ogni nodo con `requirements` verificabili coerenti con §4. Lega le attività ai contenuti seed esistenti (`06b`/`06c`) e ai temi puzzle (`05`).

---

## 7. Qualità e vincoli

- I requisiti **leggono** i dati dei moduli esistenti; nessuna duplicazione dei progressi.
- Sblocco coerente coi prerequisiti; ricalcolo idempotente lato server.
- Onboarding breve; chi è già forte salta i fondamentali.
- Transizione guidato→autonomo reale: oltre i livelli base, raccomandazioni dai dati, modalità libera in evidenza.
- Curriculum seed marcato come bozza da revisione.
- Identità bianco/nero (stato nodi senza colori); TypeScript strict; `next build` pulito; responsive e doppio tema.

---

## 8. Deliverable di questo prompt

1. Migration `path_nodes`, `user_path_progress`, `content_completions` + RLS; aggancio del `LessonViewer` al completamento.
2. `/app/onboarding` — diagnostico (autovalutazione + mini-test tattico + import opzionale) che fissa livello e rating iniziali.
3. `/app/percorso` — skill tree con stati e sblocco progressivo; voce "Percorso" in sidebar.
4. `src/lib/path/requirements.ts` — engine dei requisiti che legge i dati dei moduli, con ricalcolo idempotente.
5. Guida adattiva: widget "prossimo passo" (in `/app/percorso` e nella home), che vira da binario a raccomandazione basata sui dati/coach.
6. Curriculum seed (Livelli 0–4) collegato ai contenuti e ai temi esistenti, marcato come bozza.

**Quando hai finito, fermati.** La dashboard dei progressi è il prompt `08`.
