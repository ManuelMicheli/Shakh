# PROMPT 01 — Scacchiera core

> **Progetto:** Shakh — piattaforma di apprendimento scacchistico
> **Prerequisito:** il prompt `00` è stato completato (Next.js 15, design system bianco/nero, Supabase, auth, shell). `chessground` e `chess.js` sono già installati.
> **Questo prompt:** crea il **componente scacchiera riutilizzabile** e tutta la logica di stato di una partita lato client. È il mattone fondamentale di tutta l'app: lo riuseranno l'analisi (03), il coach (04), le tattiche (05), la teoria (06), il percorso (07). Va fatto bene e generale.
> **NON fare:** motore Stockfish, valutazioni, import partite, persistenza su database, chiamate AI, puzzle reali. Niente di tutto questo. Se sei tentato, fermati: arriva nei prompt successivi.

---

## 1. Principio architetturale (leggere prima di scrivere codice)

Due librerie con ruoli **separati e non sovrapposti**:

- **`chess.js` = la fonte di verità.** Tiene lo stato reale della partita, valida le mosse, genera le mosse legali, gestisce scacco/scaccomatto/patta, importa/esporta FEN e PGN. Nessuna mossa è valida finché `chess.js` non la conferma.
- **`chessground` = solo rendering e input.** Disegna la board e i pezzi, gestisce drag&drop e click. **Non conosce le regole**: va "guidato" dicendogli quali mosse sono legali (`dests`) e qual è la posizione corrente. È imperativo (manipola il DOM), quindi va incapsulato in un wrapper React.

Il flusso ad ogni mossa è sempre: input utente su chessground → si tenta la mossa su `chess.js` → se legale, si aggiorna lo stato → si ricalcolano posizione + `dests` + evidenziazioni → si fa `.set()` su chessground. chessground non decide mai nulla da solo.

Nota tecnica: chessground accede a `window`, quindi il componente è `'use client'` e va importato con `dynamic(..., { ssr: false })` dove montato.

---

## 2. Logica di stato: hook `useChessGame`

Crea `src/lib/chess/useChessGame.ts`. È il cervello, indipendente dalla UI. Gestisce una partita con **storia lineare navigabile**.

Stato esposto:
- `fen`: FEN della posizione attualmente visualizzata
- `turn`: `'w' | 'b'`
- `history`: array di mosse giocate (oggetti con `san`, `from`, `to`, `fen` risultante, `ply`)
- `cursor`: indice della mossa attualmente visualizzata (per navigazione avanti/indietro)
- `isCheck`, `isCheckmate`, `isStalemate`, `isDraw`, `isGameOver`
- `lastMove`: `[from, to]` per l'evidenziazione
- `legalDests`: mappa `Map<Square, Square[]>` delle mosse legali nella posizione corrente, nel formato che si dà a chessground

Metodi:
- `move(from, to, promotion?)`: tenta una mossa; ritorna `true/false` se legale; se l'utente naviga indietro e poi muove, tronca la storia da quel punto (comportamento da analisi/replay)
- `goTo(cursor)`, `next()`, `prev()`, `first()`, `last()`
- `reset(fen?)`: ricarica da una FEN (default posizione iniziale)
- `loadPgn(pgn)`: carica una partita completa da PGN e popola la storia
- `getPgn()`: esporta la partita corrente in PGN

Implementazione: tieni un'istanza `Chess` di `chess.js` come fonte di verità della partita completa; la navigazione (`cursor`) ricostruisce la posizione visualizzata senza alterare la storia. Per le promozioni, `move()` deve accettare il pezzo di promozione.

> Le **varianti ad albero** (linee alternative) NON sono richieste ora: storia lineare. Ma progetta `history` e la navigazione in modo che un domani si possa estendere a un albero senza riscrivere l'hook (il prompt 06 lo farà per la teoria).

---

## 3. Componente `<ChessBoard>`

Crea `src/components/chess/ChessBoard.tsx`: wrapper React attorno a chessground. Inizializza chessground in un `useEffect` su un `ref`, e ad ogni cambio di stato chiama `.set()` per aggiornarlo (non ricreare l'istanza ad ogni render).

Props:
- `fen?: string` — posizione da mostrare
- `orientation?: 'white' | 'black'` (default `white`)
- `mode?: 'play' | 'view' | 'puzzle'`
  - `play`: l'utente muove liberamente rispettando le regole legali
  - `view`: sola lettura, nessun input (replay/lezione)
  - `puzzle`: input permesso ma le mosse accettate sono filtrate dall'esterno (predisposizione per il prompt 05; per ora si comporta come `play` ma espone l'hook)
- `movableColor?: 'white' | 'black' | 'both'`
- `lastMove?: [Square, Square]`
- `check?: boolean`
- `shapes?` — frecce e cerchi (annotazioni); usa l'API `drawable` di chessground (predisposizione per analisi/teoria)
- `onMove?(from, to, promotion?)` — callback quando l'utente fa una mossa legale
- `coordinates?: boolean` (default true) — coordinate a/h, 1/8
- `disableAnimation?: boolean`

Requisiti visivi e di interazione:
- Drag&drop **e** click-click entrambi supportati.
- Mosse legali evidenziate quando si seleziona/trascina un pezzo.
- Ultima mossa evidenziata; re sotto scacco evidenziato.
- **UI di promozione**: quando un pedone promuove, mostra un selettore (donna/torre/alfiere/cavallo) con i pezzi del colore corretto; finché l'utente non sceglie, la mossa non è confermata.
- Board **responsive**: quadrata, scala con il contenitore, leggibile da 320px in su.

### Tema caselle e pezzi (coerente col design bianco/nero del prompt 00)

- Caselle in **grigi neutri**, non verde né marrone: casella chiara `--surface` / casella scura `--surface-2` del tema corrente (la board deve funzionare sia in tema chiaro che scuro). Bordo sottile `--border`.
- Set pezzi: **cburnett** (set standard di Lichess, libero, ottima leggibilità). Includi gli asset localmente (niente CDN esterni, GDPR).
- Importa i CSS base di chessground e sovrascrivi i colori delle caselle con le CSS variables del design system.

---

## 4. Componente `<MoveList>`

Crea `src/components/chess/MoveList.tsx`: la lista delle mosse giocate, in **notazione SAN monospace (JetBrains Mono)**, impaginata a coppie numerate (`1. e4 e5  2. Nf3 ...`).

- Click su una mossa → naviga a quella posizione (`goTo`).
- La mossa corrente (`cursor`) è evidenziata.
- Scroll automatico per tenere visibile la mossa corrente.
- Compatta e leggibile, coerente col design sobrio.

---

## 5. Controlli di navigazione

Crea `src/components/chess/BoardControls.tsx`: barra con i pulsanti **inizio / indietro / avanti / fine** e **gira scacchiera** (flip orientation). Usa i primitivi `Button` e le icone di `lucide-react`.

Accessibilità: navigazione da **tastiera** (frecce ← → per indietro/avanti, Home/End per inizio/fine) quando la board ha il focus.

---

## 6. Pagina sandbox (per sviluppo e verifica)

Crea `/app/sandbox/page.tsx`: una pagina di prova che monta `ChessBoard` + `MoveList` + `BoardControls` usando `useChessGame`, per verificare tutto il comportamento. Deve permettere di:
- giocare liberamente una partita (mode `play`) rispettando le regole;
- caricare una posizione da una FEN incollata in un input;
- caricare una partita da un PGN incollato (es. una famosa partita) e navigarla avanti/indietro;
- girare la scacchiera;
- vedere lo stato (turno, scacco, scaccomatto, patta) mostrato testualmente.

Questa pagina è uno strumento di sviluppo: lasciala raggiungibile solo da `/app/sandbox` e **non** aggiungerla alla sidebar di navigazione.

---

## 7. Qualità e vincoli

- `chess.js` è l'unica autorità sulle regole: chessground non valida mai nulla.
- L'istanza chessground non va ricreata ad ogni render (usa `.set()`); pulizia (`destroy`) allo unmount.
- TypeScript strict, tipi espliciti per props e per il valore di ritorno dell'hook.
- Nessuna chiamata di rete, nessun accesso al database, nessun Stockfish, nessuna AI.
- Asset (pezzi, CSS) serviti localmente, nessun CDN/terza parte.
- Funziona in tema chiaro e scuro, responsive da 320px, accessibile da tastiera.
- `next build` pulito.

---

## 8. Deliverable di questo prompt

1. `useChessGame` — hook completo di logica/stato partita con navigazione e PGN/FEN.
2. `<ChessBoard>` — componente riutilizzabile (modi play/view/puzzle, promozione, shapes, responsive, tema mono).
3. `<MoveList>` e `<BoardControls>` — lista mosse e navigazione, accessibili da tastiera.
4. Tema caselle bianco/nero coerente col design system + set pezzi cburnett locale.
5. Pagina `/app/sandbox` funzionante che dimostra play, load FEN, load PGN + navigazione, flip.

**Quando hai finito, fermati.** Il motore Stockfish è il prompt `02`.
