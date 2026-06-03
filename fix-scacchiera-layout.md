# FIX — Layout della scacchiera (quadrata, dimensioni, responsive)

> **Progetto:** Shakh — fix mirato del componente `ChessBoard` (creato nel prompt `01` con chessground).
> **Problema:** la scacchiera non è quadrata, ha dimensioni sbagliate e il responsive è rotto.
> **Scope:** SOLO layout e dimensionamento. **NON** toccare estetica (colori/pezzi), logica delle regole (`chess.js`), interazione (drag/click) o animazioni: funzionano. Niente refactor della logica, solo CSS/struttura/dimensioni.

---

## 1. Causa

chessground **non ha una dimensione propria**: riempie il contenitore che gli viene dato. Se quel contenitore non è forzato a restare **quadrato** con una larghezza definita, la board si deforma, collassa o esce dallo schermo. La quasi totalità dei problemi di layout di chessground è qui. Il fix è imporre un wrapper quadrato robusto e far sì che chessground lo riempia.

---

## 2. Wrapper quadrato (il fix centrale)

Avvolgi la board in un contenitore che è **sempre** quadrato via `aspect-ratio`, con larghezza fluida e un tetto su desktop, centrato:

```css
.board-square {
  width: 100%;
  max-width: var(--board-max, 640px); /* tetto su desktop */
  aspect-ratio: 1 / 1;                /* garantisce il quadrato a qualsiasi larghezza */
  margin-inline: auto;
}
/* chessground riempie il quadrato */
.board-square .cg-wrap {
  width: 100%;
  height: 100%;
}
```

L'elemento `div` su cui monti chessground deve avere classe `cg-wrap` (lo richiede chessground) ed essere figlio diretto di `.board-square`. Verifica anche che i CSS base di chessground siano importati e che `cg-container`/`cg-board` abbiano `position:absolute; width:100%; height:100%` (sono nel CSS base della libreria; se mancano, la board non si dimensiona).

**Regola d'oro:** non mettere mai la board in un flex/grid item che possa stirarla o schiacciarla senza una larghezza definita. La larghezza la decide `.board-square` (via `width` + `max-width`), **non** il flex genitore. Se è dentro un flex, dai al wrapper `flex: 0 0 auto` e una larghezza esplicita, e usa `min-width: 0` sugli altri item per evitare che spingano.

---

## 3. Coordinate dentro la board

Usa le coordinate **interne** di chessground (`coordinates: true`): vengono disegnate sui bordi delle caselle, dentro il quadrato. **Non** aggiungere righe/colonne di coordinate come elementi esterni al wrapper: romperebbero l'`aspect-ratio` e la board non sarebbe più quadrata.

---

## 4. Resize affidabile

chessground si adatta da solo perché lavora in percentuali, ma quando il contenitore cambia dimensione (rotazione mobile, apertura pannelli, resize finestra) i pezzi possono restare disallineati. Aggiungi un **ResizeObserver** sul `.board-square` che chiama `api.redrawAll()` (l'istanza chessground del prompt `01`), con un piccolo throttle. Pulisci l'observer allo smontaggio. Nessun ricalcolo manuale delle dimensioni: ci pensa il CSS, l'observer serve solo a far ridisegnare chessground.

---

## 5. Layout responsivo delle schermate che usano la board

Le pagine che affiancano board + `EvalBar` + `MoveList`/`VariationTree` (revisione partita, lezione, sandbox, tattiche) devono ridisporsi così:

```css
/* Mobile-first: tutto in colonna, board a piena larghezza */
.board-layout {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.board-layout .board-square { --board-max: 100%; }

/* Desktop: board quadrata al centro/sinistra, pannelli accanto */
@media (min-width: 900px) {
  .board-layout {
    flex-direction: row;
    align-items: flex-start;
  }
  .board-layout .board-square { --board-max: clamp(360px, 48vw, 640px); }
  .board-layout .side-panel { flex: 1 1 0; min-width: 0; } /* MoveList/EngineLines */
}
```

- La `EvalBar` (verticale) deve avere **la stessa altezza della board**: legala all'altezza del `.board-square` (es. stesso contenitore flex con `align-items: stretch`, o altezza `100%` rispetto alla board), così cresce e si rimpicciolisce con essa.
- Su mobile la board non deve mai superare la larghezza dello schermo (con il padding di pagina); su desktop non deve superare `--board-max`.
- Niente scroll orizzontale a nessun breakpoint.

---

## 6. Verifica (obbligatoria)

Controlla la board **ridimensionando la finestra dal vivo** e ai breakpoint: **320px**, mobile (~375px), tablet (~768px), desktop (~1280px), ultrawide. In ogni caso deve risultare:
- perfettamente **quadrata** (caselle quadrate, non rettangoli);
- **dentro lo schermo**, senza scroll orizzontale;
- scalata correttamente sia da sola sia affiancata ai pannelli;
- con i pezzi allineati alle caselle dopo un resize.

Testa su almeno due pagine reali (es. `/app/sandbox` e `/app/partite/[id]`), non solo in isolamento.

---

## 7. Vincoli

- Solo layout/CSS/dimensionamento e il ResizeObserver. Nessuna modifica a regole, interazione, estetica, animazioni.
- Nessuna libreria nuova.
- `next build` pulito; doppio tema invariato.

---

## Deliverable

1. Wrapper `.board-square` con `aspect-ratio: 1/1` applicato al `ChessBoard`, con CSS `cg-wrap` corretto.
2. Coordinate interne; nessun elemento esterno che rompa il quadrato.
3. ResizeObserver → `redrawAll()` con cleanup.
4. Layout responsivo `board + EvalBar + pannelli` (stack su mobile, affiancato su desktop) applicato a tutte le pagine che usano la board, con `EvalBar` legata all'altezza della board.
5. Board verificata quadrata e nello schermo da 320px all'ultrawide, con resize dal vivo.
