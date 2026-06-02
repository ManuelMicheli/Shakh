# PROMPT 06a — Infrastruttura della Teoria

> **Progetto:** Shakh — piattaforma di apprendimento scacchistico
> **Prerequisiti:** prompt `00`–`05` completati (MVP). In particolare: `content_items` con `parent_id`, `type` (opening/middlegame/endgame), `start_fen`, `line_pgn`, `body jsonb` dal `00`; `ChessBoard` e `useChessGame` dal `01`; motore, `EngineLines`, `EvalBar` dal `02`; coach AI (Q&A sulla posizione, **Funzione B**) dal `04`.
> **Questo prompt:** costruisce l'**infrastruttura** del modulo Teoria, riutilizzabile dai tre rami. Tre pezzi: (1) l'**albero delle varianti** (`MoveTree`), (2) il **viewer di lezione board-driven**, (3) le integrazioni **Opening Explorer** e **Tablebase** di Lichess. È il fondamento; i contenuti veri arrivano in `06b` (aperture) e `06c` (finali/mediogioco).
> **NON fare:** opening trainer/repertorio/SRS aperture (`06b`), pratica finali e lezioni tematiche complete (`06c`), percorso guidato (`07`), dashboard (`08`). Qui niente contenuti estesi: solo l'infrastruttura + una lezione di esempio per validare.

---

## 1. L'albero delle varianti (`MoveTree`)

Nel prompt `01` la storia delle mosse è **lineare** (giusto per giocare e rivedere partite). La teoria ha bisogno di **varianti**: da una posizione partono più mosse candidate, ognuna con il suo seguito. Serve quindi una struttura ad **albero**, separata e affiancata a `useChessGame` (non lo sostituisce: convivono, `useChessGame` resta per il gioco lineare).

> **Nota tecnica importante:** `chess.js` da solo **non** sa interpretare le varianti nel PGN (le RAV, le parentesi). Per importare PGN con varianti, commenti e NAG usa un parser dedicato (es. `@mliebelt/pgn-parser`). `chess.js` resta l'autorità sulla **legalità** delle mosse di ciascun nodo; il parser serve solo a costruire l'albero.

Crea `src/lib/chess/moveTree.ts` + hook `useMoveTree.ts`:

Struttura del nodo:
```ts
interface MoveNode {
  id: string;
  parentId: string | null;
  ply: number;
  san: string | null;        // null solo per il nodo radice (posizione iniziale)
  uci: string | null;
  fen: string;               // posizione DOPO la mossa
  children: string[];        // id dei nodi figli; children[0] = linea principale
  comment?: string;          // annotazione testuale
  nags?: number[];           // NAG (!, ?, !?, ecc.)
  shapes?: Shape[];          // frecce/cerchi per la board (API drawable di chessground)
  evalCp?: number;           // valutazione cachata (opzionale)
}
```

Hook `useMoveTree`:
- stato: mappa dei nodi, `rootId`, `currentNodeId`;
- navigazione: `goTo(nodeId)`, `next()` (segue la mainline = `children[0]`), `prev()`, `first()`, `last()`, e navigazione tra varianti dello stesso bivio;
- mutazione: `addMove(parentId, san)` (valida con `chess.js`; se la mossa esiste già come figlio, ci si sposta invece di duplicare; se è nuova, crea una variante);
- `promoteVariation(nodeId)` / `deleteVariation(nodeId)` (utili in authoring e analisi);
- import/export: `loadPgnWithVariations(pgn)` (via parser) e `toPgn()`.

La `ChessBoard` (prompt 01) si pilota già con `fen` + `lastMove` + `shapes`: collega il nodo corrente del tree a quei prop. Nessuna modifica alla board, solo un nuovo "guidatore".

---

## 2. Viewer dell'albero — `<VariationTree>`

Crea `src/components/chess/VariationTree.tsx`: visualizza l'albero in modo leggibile (mainline in evidenza, varianti annidate/indentate o tra parentesi, in **SAN monospace**), con i NAG resi come simboli (`!`, `?`, `!?`…) e i commenti inline. Click su una mossa → `goTo`. Nodo corrente evidenziato. È l'equivalente "ad albero" della `MoveList` lineare.

---

## 3. Modello del contenuto di una lezione

Una lezione teorica **non è prosa**: è una sequenza guidata sopra una posizione/linea. Definisci la forma del campo `content_items.body` (jsonb):

```ts
interface Lesson {
  intro?: string;                 // breve introduzione testuale
  tree: SerializedMoveTree;       // l'albero della linea principale + varianti
  steps: LessonStep[];            // passi guidati che puntano a nodi del tree
}
interface LessonStep {
  nodeId: string;                 // nodo del tree su cui ci si ferma
  text: string;                   // spiegazione del "perché" (in italiano)
  shapes?: Shape[];               // frecce/cerchi da mostrare a quel passo
  highlightMoves?: string[];      // mosse candidate da evidenziare
}
```

Il viewer percorre `steps`: ad ogni passo posiziona la board sul `nodeId`, mostra il testo e le frecce, e lascia l'utente libero di esplorare prima di proseguire. Definisci tipi TypeScript condivisi in `src/lib/theory/types.ts`.

---

## 4. Integrazione Opening Explorer (Lichess)

Servizio `src/lib/theory/explorer.ts` + componente `<OpeningExplorer>`.

- Endpoint: `GET https://explorer.lichess.ovh/masters?fen=<FEN>` (database dei maestri) e/o `GET https://explorer.lichess.ovh/lichess?fen=<FEN>&speeds=...&ratings=...` (partite online). Restituisce, per la posizione data, le mosse realmente giocate con conteggi e percentuali di esito (vittorie Bianco / patte / vittorie Nero), e — per i masters — le partite di riferimento.
- Componente: tabella sotto la board con le mosse reali in **SAN**, il numero di partite e le percentuali di esito (le percentuali possono usare i colori `--eval-*`? No: qui basta una barra bianco/nero/grigio per White/Draw/Black — coerente con l'identità). Click su una mossa → la gioca nel `MoveTree`.
- **Caching:** memorizza le risposte per FEN (l'API ha rate limit); evita chiamate ripetute per la stessa posizione. Gestisci errori/limiti con fallback pulito.
- È il pezzo che **ancora la teoria ai dati reali**: l'utente vede cosa si gioca davvero, non solo cosa dice la lezione.

> Collegamento opzionale col `03`: ora che l'explorer esiste, le prime mosse di una partita potrebbero essere classificate come `book`. È un miglioramento facoltativo, **non** rifare il `03` qui; eventualmente esponi solo una utility riutilizzabile `isBookMove(fen, san)`.

---

## 5. Integrazione Tablebase (finali esatti)

Servizio `src/lib/theory/tablebase.ts` + componente `<TablebasePanel>`.

- Endpoint: `GET https://tablebase.lichess.ovh/standard?fen=<FEN>` per posizioni con **≤7 pezzi**. Restituisce l'esito **esatto** (vittoria/patta/sconfitta), la distanza al matto/alla conversione (DTM/DTZ) e, per ogni mossa legale, il suo esito esatto.
- Componente: mostra l'esito esatto della posizione e le mosse ordinate per qualità (vincente / che mantiene la patta / perdente), in SAN. Niente approssimazione del motore: qui la verità è assoluta.
- Verrà usato dal `06c` per la pratica dei finali; qui crea servizio + componente e un punto di prova.
- Caching per FEN; fallback pulito se la posizione ha troppi pezzi (mostra invece la valutazione del motore del prompt 02).

---

## 6. Viewer di lezione board-driven — `<LessonViewer>`

Il componente che mette insieme tutto, riusabile dai tre rami:

- **Board** (prompt 01) pilotata dal `MoveTree`.
- **`VariationTree`** + **controlli** di navigazione (riusa `BoardControls`, tastiera ← →).
- **Pannello passi**: testo del passo corrente, con avanzamento guidato lungo `steps`.
- **Esplorazione libera + deviazione:** l'utente può muovere fuori dalla linea. Quando lo fa, due strumenti a richiesta:
  - **Motore** (prompt 02): `EvalBar` + `EngineLines` per valutare la deviazione;
  - **Coach** (prompt 04, **Funzione B**): bottone *"perché non questa mossa?"* → il motore valuta la mossa proposta, il coach la **spiega in italiano**. Riuso diretto del flusso già esistente, nessuna nuova logica AI.
- **Contesto dinamico:** in una lezione di tipo `opening` mostra l'`OpeningExplorer` della posizione corrente; in una di tipo `endgame` mostra il `TablebasePanel`.
- Tutto in tema chiaro/scuro, responsive (mobile: board sopra, pannelli sotto in tab).

---

## 7. Navigazione del modulo

- Pagina hub `/app/teoria` con i tre rami (Aperture / Mediogioco / Finali) — le sezioni interne dei rami verranno riempite da `06b`/`06c`; qui crea l'hub e il routing.
- Pagina lezione `/app/teoria/[slug]` che carica un `content_items` pubblicato e lo apre nel `LessonViewer`.
- Attiva la voce "Teoria" nella sidebar.
- Lettura dei contenuti: `content_items` con `published = true` (RLS già pronta dal `00`, lettura pubblica dei contenuti).

---

## 8. Lezione di esempio (solo per validare l'infrastruttura)

Crea **una** lezione campione come seed (es. le prime mosse di una sola apertura, con 1–2 varianti e 3–4 `steps`), per dimostrare end-to-end: caricamento, navigazione albero, passi guidati, explorer attivo, deviazione + Q&A del coach. **Non** è il contenuto vero del prodotto: serve solo a far vedere che l'infrastruttura funziona. I contenuti reali arrivano in `06b`/`06c`.

---

## 9. Qualità e vincoli

- `MoveTree` separato da `useChessGame`; `chess.js` resta l'autorità sulla legalità; parser dedicato solo per le varianti PGN.
- Explorer e Tablebase: **caching per FEN**, gestione rate limit e fallback puliti; chiamate alle API pubbliche Lichess, nessun'altra terza parte.
- Riuso del coach (Funzione B del `04`) per la deviazione: nessuna nuova logica AI, e vale il principio "motore dà i numeri, modello dà le parole".
- Identità bianco/nero; i colori semantici solo dove comunicano un esito.
- TypeScript strict, tipi condivisi in `src/lib/theory/types.ts`; `next build` pulito; responsive e doppio tema.

---

## 10. Deliverable di questo prompt

1. `MoveTree` + `useMoveTree` (albero varianti, navigazione, mutazione, import/export PGN con varianti).
2. `<VariationTree>` — viewer dell'albero in SAN monospace con NAG e commenti.
3. Modello `Lesson`/`LessonStep` + tipi condivisi in `src/lib/theory/types.ts`.
4. `explorer.ts` + `<OpeningExplorer>` (con caching) e `tablebase.ts` + `<TablebasePanel>` (con caching).
5. `<LessonViewer>` board-driven completo (passi guidati, esplorazione libera, deviazione + Q&A del coach, contesto explorer/tablebase).
6. Hub `/app/teoria` + pagina lezione `/app/teoria/[slug]`; voce "Teoria" in sidebar; una lezione di esempio come seed.

**Quando hai finito, fermati.** Le aperture (trainer + repertorio + ripetizione spaziata) sono il prompt `06b`.
