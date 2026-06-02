# PROMPT 03 — Import & Analisi delle partite

> **Progetto:** Shakh — piattaforma di apprendimento scacchistico
> **Prerequisiti:** prompt `00` (DB con tabelle `games` e `game_analysis`, auth, design), `01` (scacchiera, `useChessGame`, `MoveList`), `02` (motore: `engine.ts`, `useEngineAnalysis`, `score.ts`, `EvalBar`, `EngineLines`) completati.
> **Questo prompt:** è il **cuore dell'MVP**. L'utente importa le proprie partite, l'app le analizza mossa-per-mossa col motore e **classifica ogni mossa** (book/best/good/inaccuracy/mistake/blunder), poi le mostra in una schermata di revisione con grafico dell'andamento. È la base su cui il prompt `04` innesterà il coach AI.
> **NON fare:** commenti in linguaggio naturale / spiegazioni AI (è il `04`), opening explorer dettagliato (è il `06`), tattiche, teoria. La classificazione qui è **puramente basata sulla valutazione del motore**, niente linguaggio.

---

## 1. Import delle partite

Tre vie di import, salvataggio nella tabella `games` (RLS già attiva, dati dell'utente loggato):

1. **Incolla PGN**: textarea; supporta uno o più giochi in un singolo PGN. Parsing con `chess.js` (header Event/White/Black/Result/Date + mosse).
2. **Carica file `.pgn`**: stesso parsing.
3. **Connetti Lichess** (username): scarica le ultime N partite via API pubblica di Lichess
   `GET https://lichess.org/api/games/user/{username}` (formato PGN o NDJSON, max configurabile, nessuna autenticazione necessaria per partite pubbliche). Rispetta i rate limit (richieste sequenziali, gestione 429).

> **Chess.com**: predisponi l'astrazione `GameProvider` così aggiungere l'import da Chess.com (`https://api.chess.com/pub/player/{username}/games/archives`) in futuro sia banale, ma **non** implementarlo ora.

Per ogni partita importata determina e salva: `pgn`, `white`, `black`, `result`, `played_at`, `source`, `external_id` (per dedup), e `user_color` se riconducibile all'utente (match per username Lichess). Evita duplicati su `(user_id, source, external_id)`.

Pagina lista: `/app/partite` — elenco partite dell'utente (avversari, risultato, data, stato "analizzata / da analizzare"), con azioni "analizza" e "rivedi".

---

## 2. Analisi mossa-per-mossa (motore, lato client)

L'analisi gira **nel browser**, riusando il worker Stockfish del prompt `02`. È un job sequenziale sulle posizioni della partita, con **barra di progresso**.

Per ogni semimossa (ply):
1. Posizione **prima** della mossa → motore a profondità fissa (default `depth 15`, configurabile) → ottieni `evalBefore` (white-relative) e `bestMove`.
2. Posizione **dopo** la mossa effettivamente giocata → `evalAfter`.
3. Salva la riga in `game_analysis`: `ply`, `san`, `fen`, `eval_before`, `eval_after`, `best_move_san`, `classification`.

Ottimizzazioni:
- Profondità moderata per tenere i tempi ragionevoli (insegnare non richiede depth 30).
- (Opzionale, predisposto) consultare la **cloud eval gratuita di Lichess** (`GET https://lichess.org/api/cloud-eval?fen=...`) prima di calcolare localmente: se la posizione è già nota, si risparmia CPU. Se non disponibile (404), si calcola col motore locale.
- Salvataggio progressivo su DB; a fine job imposta `games.analyzed = true`.
- Una partita alla volta; mostra "posizione X/Y".

---

## 3. Classificazione delle mosse (solo numeri, niente parole)

La classificazione si basa sulla **perdita in centipawn** dal punto di vista di chi muove: quanto la mossa giocata peggiora la posizione rispetto alla migliore.

```
loss = eval_best(perspective) - eval_played(perspective)   // in centipawn, ≥ 0
```
dove le valutazioni sono prese **dal punto di vista del giocatore al tratto** (usa `toWhiteRelative` del prompt 02 e poi inverti per il Nero).

Soglie di partenza (rendile costanti configurabili in `src/lib/analysis/thresholds.ts`):
- `loss ≥ 300` → **blunder**
- `150 ≤ loss < 300` → **mistake**
- `50 ≤ loss < 150` → **inaccuracy**
- mossa == `bestMove` del motore → **best**
- altrimenti → **good**

Regole speciali:
- **Matto:** se il giocatore aveva un matto forzato e lo perde, o se entra in un matto subìto, è **blunder** a prescindere dai centipawn. Gestisci i `mate` score esplicitamente (non trattarli come centipawn enormi grezzi).
- **`book`:** il campo esiste (enum del prompt 00) ma **NON** popolarlo ora — richiede l'opening explorer del prompt `06`. Per adesso le prime mosse seguono la classificazione normale; predisponi solo il punto di innesto.
- In posizioni già **decise** (es. +8 che diventa +6), un calo non va segnalato come dramma: applica una regola di "non declassare sotto una certa soglia di vantaggio già schiacciante" per evitare falsi blunder. Tienila semplice ma presente.

> **Brilliant / Great** (sacrifici corretti, mosse uniche): **fuori scope** ora. Sono raffinamenti delicati (facili da sbagliare e screditanti se sbagliati). Lasciali per una versione successiva; non inventarli.

---

## 4. Schermata di revisione partita — `/app/partite/[id]`

Riusa i componenti dei prompt 01–02. Layout:

- **`ChessBoard`** (mode `view`) sincronizzata con la navigazione mosse.
- **`EvalBar`** accanto alla board, che segue la posizione mostrata.
- **`MoveList`** dove ogni mossa è marcata con la sua **classificazione**, usando i colori semantici `--eval-*` del prompt 00 (icona/pallino accanto alla mossa: blunder, mistake, inaccuracy…). Questi sono gli unici colori ammessi nella UI.
- **`BoardControls`** per navigare; tastiera ← →.
- **Grafico andamento valutazione** (`<EvalGraph>`): linea white-relative su tutta la partita, con i punti di blunder/mistake evidenziati; click su un punto → salta a quella mossa. SVG inline + Framer Motion, **niente librerie di charting** (coerente con il tuo approccio "Financial Terminal": disegno SVG controllato a mano).
- **Riepilogo partita**: conteggio per colore di blunder/mistake/inaccuracy e una **stima di accuratezza %** per lato (formula semplice basata sulla perdita media in centipawn → percentuale; documenta che è una stima, non lo standard ufficiale di Lichess/Chess.com).

Tutto in tema chiaro/scuro, responsive (su mobile board sopra, lista/grafico sotto).

---

## 5. Persistenza e azioni

- Server Actions / route handler per: salvare partite importate, salvare le righe di `game_analysis`, segnare `analyzed`.
- Mai rianalizzare una partita già analizzata (leggi da `game_analysis`); offri "rianalizza" esplicito (cancella e ricalcola).
- Tutto rispetta la RLS: l'utente vede e analizza solo le proprie partite.

---

## 6. Qualità e vincoli

- La classificazione è **deterministica e basata sul motore**: nessun linguaggio naturale, nessuna AI in questo prompt.
- Analisi nel worker, non blocca la UI; progresso visibile; salvataggio progressivo.
- Gestione errori di rete (import Lichess: 404 utente inesistente, 429 rate limit) con messaggi puliti.
- Niente CDN/terze parti oltre alle API pubbliche di Lichess.
- TypeScript strict, `next build` pulito, soglie centralizzate e configurabili.

---

## 7. Deliverable di questo prompt

1. Import partite: incolla PGN, upload `.pgn`, connessione Lichess (con astrazione `GameProvider` pronta per Chess.com).
2. Job di analisi mossa-per-mossa nel worker Stockfish, con progresso e salvataggio in `game_analysis`.
3. Classificazione delle mosse (book predisposto, best/good/inaccuracy/mistake/blunder) con gestione dei matti e delle posizioni già decise.
4. Pagina `/app/partite` (lista) e `/app/partite/[id]` (revisione completa).
5. `<EvalGraph>` in SVG inline (no librerie) con punti d'errore cliccabili; riepilogo con stima accuratezza.
6. Voce "Le mie partite" attivata nella sidebar.

**Quando hai finito, fermati.** Le spiegazioni in italiano del coach AI sono il prompt `04`.
