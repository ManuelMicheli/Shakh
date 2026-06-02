# PROMPT 02 — Motore (Stockfish WASM)

> **Progetto:** Shakh — piattaforma di apprendimento scacchistico
> **Prerequisiti:** prompt `00` (fondamenta, design bianco/nero) e `01` (scacchiera core: `useChessGame`, `ChessBoard`, `MoveList`, `BoardControls`, pagina `/app/sandbox`) completati.
> **Questo prompt:** integra **Stockfish in WebAssembly dentro un web worker** ed espone un wrapper pulito per valutare una posizione. È la capacità di calcolo che useranno l'analisi partite (03) e, indirettamente, il coach (04) e la teoria (06).
> **NON fare:** analisi di partite intere mossa-per-mossa, classificazione degli errori (blunder/mistake…), commenti AI, persistenza su DB, opening explorer. Questo prompt si ferma a "data una posizione, ottengo una valutazione". Il resto arriva dopo.

---

## 1. Scelta della build (leggere prima)

Usa il pacchetto npm **`stockfish`** (la build WASM di Stockfish, attualmente Stockfish 18, la stessa famiglia usata in-browser da Chess.com).

Per l'MVP usa la variante **lite single-thread** (`stockfish-18-lite-single`, ~7MB):
- gira su tutti i browser moderni **senza** header CORS speciali;
- non richiede cross-origin isolation;
- è più che sufficiente per analisi a profondità medie (l'obiettivo non è battere i record, è dare valutazioni affidabili per insegnare).

La variante **full multi-thread** (molto più forte, ma >100MB e richiede gli header `Cross-Origin-Opener-Policy: same-origin` + `Cross-Origin-Embedder-Policy: require-corp`) **NON va attivata ora**: quegli header rompono il caricamento di risorse cross-origin e complicano il deploy. Limitati a **documentare** in un commento / breve nota `README` come si passerebbe alla full in futuro (sostituzione file worker + header in `next.config`). Non aggiungere quegli header adesso.

I file del motore (`.js` + `.wasm`) vanno serviti **localmente** come asset statici (es. `public/engine/`), non da CDN. Predisponi uno step (script o istruzione) che copia i file dal pacchetto npm a `public/engine/` in fase di build/postinstall, così il worker li carica da `/engine/...`.

---

## 2. Come funziona (protocollo UCI)

Stockfish comunica via **protocollo UCI**, a messaggi di testo. Il ciclo tipico:
1. `uci` → il motore risponde con le sue opzioni e infine `uciok`
2. `isready` → risponde `readyok`
3. `setoption name MultiPV value N` (opzionale, per più linee)
4. `position fen <FEN>`
5. `go depth <D>` (oppure `go movetime <ms>`)
6. il motore emette righe `info depth ... score cp <X> | score mate <Y> ... pv <mosse UCI>`
7. infine `bestmove <mossa>`
8. `stop` per interrompere prima del tempo

Va incapsulato: Stockfish gira in un **web worker** (per non bloccare il main thread) e il protocollo testuale va wrappato in un'API pulita a promesse/callback.

---

## 3. Servizio motore (singleton lazy)

Crea `src/lib/engine/engine.ts`: un **singleton** che possiede una sola istanza del worker (caricarne molte è costoso). Caricamento **lazy**: il WASM (~7MB) si carica solo alla prima richiesta di analisi, mai al boot dell'app. Esponi lo stato di caricamento (`idle | loading | ready | error`).

API del servizio:
- `init(): Promise<void>` — crea il worker, esegue handshake UCI fino a `readyok`. Idempotente.
- `analyze(fen, opts): AnalysisHandle` dove `opts = { depth?, movetime?, multiPV? }`.
  - Ritorna un handle con:
    - `onUpdate(cb)`: callback chiamata ad ogni `info` con la valutazione parziale (depth corrente, score, pv) — per aggiornare la UI in tempo reale durante la ricerca;
    - `result: Promise<EngineEvaluation>`: si risolve al `bestmove`;
    - `cancel()`: invia `stop`.
  - **Una sola analisi alla volta:** se ne parte una nuova mentre un'altra è in corso, il servizio fa `stop` della precedente e poi lancia la nuova (cancella la vecchia, niente coda infinita).
- `setMultiPV(n)`: imposta il numero di linee (per teoria/analisi: vedere più candidate).
- `quit()`: termina il worker.

Tipo del risultato:
```ts
type ScoreType = 'cp' | 'mate';
interface EngineLine {
  multipv: number;          // 1 = linea principale
  scoreType: ScoreType;
  score: number;            // centipawn, oppure numero di mosse al matto
  depth: number;
  pv: string[];             // mosse in UCI (es. 'e2e4')
  pvSan?: string[];         // opzionale: convertite in SAN via chess.js
}
interface EngineEvaluation {
  fen: string;
  bestMove: string;         // UCI
  lines: EngineLine[];      // ordinate per multipv
  depth: number;
}
```

---

## 4. Normalizzazione del punteggio (dettaglio importante)

UCI restituisce lo `score` **dal punto di vista del lato al tratto**. Le interfacce mostrano invece la valutazione **relativa al Bianco** (convenzione standard: positivo = vantaggio Bianco).

Crea utility in `src/lib/engine/score.ts`:
- `toWhiteRelative(score, scoreType, turn)`: se il tratto è al Nero, inverte il segno.
- `formatEval(score, scoreType)`: produce la stringa da mostrare in **monospace** — es. `+1.4`, `-0.7`, `M5` (matto in 5 a favore del Bianco), `-M3`. I centipawn si mostrano in pedoni con un decimale.
- Tutte le valutazioni mostrate all'utente passano da qui, per coerenza.

---

## 5. Hook React `useEngineAnalysis`

Crea `src/lib/engine/useEngineAnalysis.ts`: hook che consuma il servizio per analizzare **la posizione corrente** (FEN passato come argomento). Gestisce: avvio analisi al cambio di FEN (con debounce), aggiornamenti live, cancellazione della precedente, stato di caricamento del motore. Ritorna `{ evaluation, isThinking, engineState, depth }`.

Deve poter essere acceso/spento (non analizzare se non richiesto) per non sprecare CPU.

---

## 6. Componente `<EvalBar>` (riutilizzabile)

Crea `src/components/chess/EvalBar.tsx`: la classica **barra di valutazione verticale**. È letteralmente bianco/nero, quindi calza a pennello con l'identità del prodotto: porzione **bianca** = vantaggio Bianco, porzione **nera** = vantaggio Nero, la proporzione segue la valutazione.

- Mappa la valutazione su una percentuale con una curva morbida (clamp tipico a ±~10 pedoni, poi plateau; usa una funzione sigmoide/`atan` per la transizione).
- Matto → barra completamente piena dal lato vincente.
- Mostra il valore numerico (`formatEval`) in monospace all'estremità.
- Animazione fluida del riempimento (Framer Motion), accessibile (label testuale del valore).
- Affiancabile alla `ChessBoard` (stessa altezza), funziona in tema chiaro e scuro.

---

## 7. Pannello linee `<EngineLines>` (riutilizzabile)

Crea `src/components/chess/EngineLines.tsx`: mostra le linee del motore (una o più con MultiPV) — per ciascuna: valutazione (mono) + linea principale in **SAN** (converti la pv UCI in SAN con `chess.js` a partire dal FEN). Click su una mossa della pv = predisponi una callback `onSelectMove` (la useranno i moduli successivi per "giocare" la linea); per ora può solo evidenziarla.

---

## 8. Integrazione nella sandbox

Estendi `/app/sandbox` (creata nel prompt 01) aggiungendo una sezione "Motore":
- toggle per accendere/spegnere l'analisi della posizione corrente;
- `<EvalBar>` accanto alla board;
- `<EngineLines>` con MultiPV impostabile (1–3);
- indicatore di profondità raggiunta e stato del motore (loading/ready/thinking).

Deve funzionare insieme alla navigazione: spostandosi tra le mosse (`useChessGame`), il motore rianalizza la posizione mostrata.

---

## 9. Qualità e vincoli

- Stockfish gira **nel worker**, mai sul main thread; caricamento **lazy** (solo alla prima analisi).
- File motore serviti **localmente** da `/engine/`, nessun CDN.
- **Nessun** header COOP/COEP aggiunto ora (resta sulla build lite-single). Solo nota documentale per la full.
- Una sola analisi attiva alla volta; cancellazione pulita della precedente; `quit`/cleanup allo smontaggio.
- Tutte le valutazioni passano da `formatEval` / `toWhiteRelative`.
- Gestione errori: se il WASM non carica (browser non supportato), stato `error` e messaggio pulito, senza crash dell'app.
- TypeScript strict; `next build` pulito; funziona in tema chiaro e scuro.
- Nessuna chiamata AI, nessun accesso al database, nessuna analisi di partite intere.

---

## 10. Deliverable di questo prompt

1. Build Stockfish lite-single integrata, file serviti da `/engine/`, caricamento lazy in un web worker.
2. `engine.ts` — servizio singleton con wrapper UCI a promesse (`init`, `analyze` con update live + cancel, `setMultiPV`, `quit`).
3. `score.ts` — normalizzazione white-relative e `formatEval`.
4. `useEngineAnalysis` — hook per analizzare la posizione corrente, accendibile/spegnibile.
5. `<EvalBar>` (bianco/nero) ed `<EngineLines>` (SAN, MultiPV) riutilizzabili.
6. Sandbox estesa che dimostra valutazione live, MultiPV e analisi sincronizzata con la navigazione delle mosse.

**Quando hai finito, fermati.** L'import e l'analisi delle partite intere è il prompt `03`.
