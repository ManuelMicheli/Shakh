# PROMPT 06c — Finali & Mediogioco

> **Progetto:** Shakh — piattaforma di apprendimento scacchistico
> **Prerequisiti:** prompt `00`–`05` (MVP), `06a` (infrastruttura: `LessonViewer`, `TablebasePanel`, `MoveTree`, tipi `Lesson`) e `06b` (aperture) completati. Motore dal `02`, coach Funzione B dal `04`, puzzle a tema dal `05`.
> **Questo prompt:** chiude il ramo Teoria con i **Finali** (lezioni + pratica contro la tablebase) e il **Mediogioco** (lezioni tematiche board-driven + esercizi posizionali). Include i contenuti-vetrina: 5 finali fondamentali e 3 temi di mediogioco.
> **NON fare:** aperture (già nel `06b`), percorso guidato (`07`), dashboard (`08`).

---

## 1. Finali — `/app/teoria/finali`

### Browse e lezioni
I `content_items` di tipo `endgame`, organizzati per gerarchia classica (re e pedoni → torre → alfiere → cavallo → donna → misti). Le lezioni si aprono nel `LessonViewer` (`06a`), con il `TablebasePanel` attivo nel contesto.

### Pratica contro la tablebase (il pezzo forte)
Modalità "risolvi il finale": data una posizione teorica con **≤7 pezzi**, l'utente deve **convertire l'esito** (vincere una posizione vinta, o pattare una pattabile).
- L'**avversario gioca la difesa perfetta** secondo la tablebase Lichess (`06a`): sceglie la mossa che massimizza la resistenza (DTZ/DTM ottimale per il lato difendente).
- Dopo ogni mossa dell'utente, verifica con la tablebase che l'esito **non peggiori**: se l'utente getta via la vittoria (l'esito passa da "vinto" a "patta/perso"), feedback immediato con possibilità di ritentare dalla posizione precedente.
- Indicatore dell'esito teorico corrente (vinto / patta / perso) e, opzionale, della distanza alla conversione.
- È didatticamente impeccabile perché la tablebase è **verità assoluta**: nessuna approssimazione, nessuna allucinazione possibile.
- Fallback: se la posizione supera i 7 pezzi (non dovrebbe per i finali teorici), usa il motore (`02`) e segnala che è una stima.

Aggiorna `user_progress` (dimensione `endgame`, `key` = tipo di finale, es. `lucena`, `kp_vs_k`).

### Seed-vetrina: i 5 finali fondamentali
Crea come `content_items` (tipo `endgame`, `body` in formato `Lesson`), ciascuno con lezione + posizione di pratica:
1. **Re e pedone contro re** — opposizione e regola del quadrato.
2. **Posizione di Lucena** (torre) — la tecnica del "ponte" per vincere.
3. **Posizione di Philidor** (torre) — la difesa per pattare.
4. **Matti elementari** — Re+Donna contro Re e Re+Torre contro Re.
5. **Donna contro pedone** sulla settima/sesta — quando si vince e quando è patta.

Le posizioni di pratica vanno verificate con la **tablebase** (esiti e mosse esatti); le spiegazioni in italiano sono **bozze da revisione**, non verità definitiva.

---

## 2. Mediogioco — `/app/teoria/mediogioco`

### Lezioni tematiche
I `content_items` di tipo `middlegame`, organizzati **per tema** (non per apertura). Lezioni board-driven nel `LessonViewer`, costruite su **posizioni-tipo** che illustrano il concetto, con piani per entrambi i lati e varianti illustrative.

### Esercizi posizionali
Il mediogioco posizionale non si presta ai puzzle tattici secchi del `05`. Due tipi di esercizio:
- **Trova il piano / la mossa:** data una posizione-tipo, l'utente propone una mossa → il motore (`02`) la valuta → il coach (`04`, Funzione B) commenta se è coerente col piano corretto, in italiano. Non c'è un'unica "soluzione": si valuta la ragionevolezza.
- **Collegamento alle tattiche a tema:** dove pertinente (es. temi che hanno corrispondenza nei temi Lichess come `sacrifice`, `attack`), linka alla modalità "per tema" del `05`.

Aggiorna `user_progress` (dimensione `middlegame_theme`, `key` = slug del tema).

### Seed-vetrina: 3 temi
Crea come `content_items` (tipo `middlegame`):
1. **Il pedone isolato di donna (IQP)** — giocare con l'isolano (attività, attacco) e contro (bloccare, finale).
2. **Colonna aperta e settima traversa** — conquistare la colonna, raddoppiare le torri, l'invasione.
3. **Case deboli e avamposti** — creare e sfruttare un avamposto, il buon cavallo contro l'alfiere cattivo.

Posizioni e linee validate con `chess.js` e con le valutazioni del motore; spiegazioni in italiano marcate come **bozze da revisione**.

---

## 3. Navigazione

- Attiva le sezioni Finali e Mediogioco nell'hub `/app/teoria` (creato nel `06a`).
- Le lezioni usano lo stesso `LessonViewer`; cambia solo il pannello contestuale: `TablebasePanel` per i finali, `OpeningExplorer`/motore dove utile per il mediogioco.

---

## 4. Qualità e vincoli

- Finali: la **tablebase** è l'autorità sugli esiti; l'avversario gioca la difesa ottimale; verifica del non-peggioramento dopo ogni mossa dell'utente; caching per FEN (dal `06a`).
- Mediogioco: gli esercizi "trova il piano" non hanno soluzione unica; il giudizio passa dal motore + coach, senza che il modello inventi valutazioni.
- Contenuti seed validati con `chess.js`/tablebase/motore e marcati come bozza da revisione; nessuna linea o valutazione inventata.
- Identità bianco/nero; colori semantici solo per gli esiti.
- TypeScript strict; `next build` pulito; responsive e doppio tema.

---

## 5. Deliverable di questo prompt

1. `/app/teoria/finali` — browse, lezioni nel `LessonViewer`, e pratica contro la tablebase con difesa perfetta e verifica del non-peggioramento.
2. Seed dei 5 finali fondamentali (re/pedone, Lucena, Philidor, matti elementari, donna vs pedone), con posizioni verificate da tablebase.
3. `/app/teoria/mediogioco` — lezioni tematiche board-driven ed esercizi posizionali (motore + coach), con collegamento alle tattiche a tema.
4. Seed di 3 temi di mediogioco (IQP, colonna aperta/settima, case deboli/avamposti).
5. Aggiornamento `user_progress` (`endgame`, `middlegame_theme`).
6. Hub `/app/teoria` con tutti e tre i rami attivi.

**Quando hai finito, fermati.** Con questo il ramo Teoria (`06a`/`06b`/`06c`) è completo. Restano il percorso guidato (`07`) e la dashboard dei progressi (`08`) per la V2, poi il layer istruttore/circolo (`09`) e GDPR/SEO/deploy (`10`) per la V3.
