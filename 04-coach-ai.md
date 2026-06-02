# PROMPT 04 — Coach AI (in italiano)

> **Progetto:** Shakh — piattaforma di apprendimento scacchistico
> **Prerequisiti:** prompt `00`–`03` completati. In particolare il `03` ha popolato `game_analysis` con, per ogni mossa: `eval_before`, `eval_after`, `best_move_san`, `classification`. Esiste il campo `game_analysis.ai_comment` (vuoto) e la tabella `user_progress`.
> **Questo prompt:** è il **differenziatore del prodotto**. Un coach in **italiano** che spiega *perché* una mossa è un errore, risponde a domande sulla posizione e sintetizza i pattern d'errore ricorrenti dell'utente. Usa l'**API Anthropic** lato server.
> **NON fare:** generare valutazioni, trovare la mossa migliore o decidere se una mossa è buona. Quello lo ha già fatto Stockfish nel `03`. Il coach **spiega**, non **calcola**.

---

## 1. Principio non negoziabile (leggere prima di tutto)

> **Il motore fornisce i numeri, il modello fornisce le parole.**

L'AI riceve **in input** i dati oggettivi già calcolati (FEN, mossa giocata in SAN, mossa migliore del motore, `eval_before`/`eval_after`, classificazione, ed eventuali statistiche reali) e produce **solo** la spiegazione in linguaggio naturale di ciò che quei dati dicono.

Vietato chiedere al modello di:
- valutare una posizione ("quanto è buona questa mossa?") → lo decide il motore;
- trovare la mossa migliore → la dà il motore;
- inventare linee o valutazioni non fornite in input.

Questo è ciò che rende le spiegazioni affidabili invece che allucinate. Il pubblico scacchistico individua un errore di valutazione in un secondo; ancorare al motore è l'unico modo per evitarlo. **Costruisci i prompt di sistema in modo che il modello sappia che i numeri sono dati, non opinabili.**

---

## 2. Setup API Anthropic (lato server, mai client)

- SDK ufficiale `@anthropic-ai/sdk`. Chiave da `ANTHROPIC_API_KEY` (env del prompt `00`), usata **solo** in route handler / server action. **Mai** esporre la chiave o chiamare l'API dal browser.
- Modelli (stringhe attuali):
  - spiegazioni, commenti e Q&A didattici → **`claude-sonnet-4-6`** (equilibrio qualità/costo, default);
  - eventuali task ad alto volume e bassa criticità → **`claude-haiku-4-5-20251001`** (più economico).
  - Rendi il modello una costante configurabile in `src/config/ai.ts`.
- Usa lo **streaming** per le risposte lunghe (commento esteso, Q&A), così l'utente vede il testo comparire.
- Per i dettagli aggiornati dell'SDK e dello streaming fai riferimento alla doc ufficiale: https://docs.claude.com/en/api/overview
- Centralizza ogni interazione in `src/lib/ai/coach.ts` (costruzione prompt + parsing), così la logica AI sta in un punto solo.

---

## 3. Funzione A — Spiegazione di una mossa

Endpoint server che, dato un `game_analysis` row id (o i suoi dati), produce una spiegazione in italiano.

Input passato al modello (come dati, non come opinione):
- FEN della posizione prima della mossa;
- mossa giocata (SAN) e sua classificazione;
- mossa migliore secondo il motore (SAN) e relative valutazioni `eval_before`/`eval_after` (in formato leggibile, es. "da +0.3 a −1.8");
- fase di gioco (apertura/medio/finale, derivabile dal numero di pezzi/mosse);
- livello stimato dell'utente (`profiles.elo_estimate`, se presente) per calibrare il linguaggio.

Output richiesto: spiegazione **concisa** (2–4 frasi), in italiano, didattica, che dica *cosa* la mossa migliore otteneva e *perché* quella giocata peggiora (il piano, la debolezza creata, la tattica mancata). Tono da allenatore: diretto, incoraggiante, senza gergo inutile. Niente valutazioni numeriche inventate oltre a quelle fornite.

**Caching e controllo costi (importante):**
- Salva il risultato in `game_analysis.ai_comment`; non rigenerare se già presente.
- **NON** commentare automaticamente tutte le mosse di una partita (40–80 chiamate = costo e lentezza). Strategia:
  - genera automaticamente solo per gli **errori chiave** (blunder e mistake), e solo **on-demand** o in un singolo batch quando l'utente apre la revisione;
  - per tutte le altre mosse, commento generato **solo se** l'utente clicca "spiega" su quella mossa.
- Esponi il numero di commenti generati / costo stimato non è necessario in UI, ma tieni il design parsimonioso.

UI: nella schermata revisione (`/app/partite/[id]` del prompt 03), accanto a ogni mossa-errore un'azione "spiega" → mostra `ai_comment` (streaming alla prima generazione). Le mosse-errore principali possono mostrare il commento già pronto.

---

## 4. Funzione B — Domande sulla posizione (Q&A)

Una chat contestuale sulla posizione attualmente visualizzata: l'utente chiede cose come *"perché non posso giocare Cd4 qui?"* o *"qual è il piano per il Bianco?"*.

Flusso che rispetta il principio §1:
1. Se la domanda riguarda una **mossa concreta** ("perché non X?"), prima il **motore** (prompt 02) valuta quella mossa specifica + la posizione → si ottengono i numeri.
2. Quei numeri + il FEN + la domanda vanno al modello, che **spiega** in italiano.
3. Per domande generali di piano ("cosa devo fare qui?"), passa al modello la valutazione del motore e le sue linee principali (pv in SAN) come base fattuale, e chiedi la spiegazione del piano coerente con quelle linee.

UI: pannello/chat nella schermata revisione, legata alla posizione corrente; risposte in streaming. Mantieni un breve contesto conversazionale (le ultime battute), inviando ogni volta lo stato necessario (FEN corrente, dati motore), perché il modello non ha memoria tra le chiamate.

---

## 5. Funzione C — Sintesi dei pattern d'errore + aggiornamento progressi

Dopo l'analisi di una partita (o su richiesta dal profilo), produci un **riassunto** dei punti deboli ricorrenti e aggiorna `user_progress`.

Approccio ibrido (dati + AI):
- **Parte dati (deterministica):** dall'insieme delle `game_analysis` dell'utente, deriva metriche oggettive — in quale **fase** perde di più (apertura/medio/finale), frequenza di blunder, se gli errori si concentrano in certi tipi di posizione. Aggiorna le righe `user_progress` (dimensione `middlegame_theme` / `endgame` / ecc., con `attempts`, `successes`, `score`). Questo NON richiede AI.
- **Parte AI (sintesi):** passa al modello le metriche aggregate (già calcolate) e chiedi un riassunto in italiano, motivante e azionabile: *"perdi soprattutto nei finali di torre e tendi a sbagliare quando hai poco tempo; ecco su cosa concentrarti"*. Anche qui: l'AI sintetizza dati forniti, non li inventa.

Output della sintesi in un formato strutturato (chiedi al modello **solo JSON**, niente testo extra né markdown, e fai un parse robusto): es. `{ summary: string, focusAreas: string[], suggestion: string }`. Salva/mostra nel profilo dell'utente (la dashboard completa è il prompt `08`; qui basta esporre la sintesi).

---

## 6. Prompt di sistema del coach (linee guida)

Definisci in `src/lib/ai/prompts.ts` i system prompt, con questi cardini:
- ruolo: allenatore di scacchi esperto, che parla **italiano**, paziente e diretto;
- regola ferrea: le valutazioni e le mosse migliori fornite nell'input sono **fatti dati dal motore**, da non mettere in discussione né reinventare;
- calibrazione al livello dell'utente quando disponibile;
- concisione: spiegazioni brevi e utili, non muri di testo;
- nessun gergo da motore ("centipawn", "depth") rivolto all'utente: tradotto in concetti scacchistici comprensibili.

---

## 7. Privacy / GDPR

- Le posizioni e le mosse inviate all'API sono dati di gioco, non personali sensibili; tuttavia documenta nell'informativa (prompt `10`) che l'analisi del coach usa un servizio AI di terze parti (Anthropic). Non inviare dati personali identificativi nel prompt (username reali, email): per il coach servono solo FEN/mosse/valutazioni.

---

## 8. Qualità e vincoli

- API Anthropic **solo lato server**; chiave mai esposta.
- Il modello **non** produce valutazioni o mosse migliori: solo spiegazioni di dati forniti.
- Caching dei commenti in `ai_comment`; generazione parsimoniosa (errori chiave + on-demand), mai 80 chiamate automatiche.
- Streaming per le risposte lunghe; parsing robusto del JSON nella sintesi (gestisci risposte non perfette).
- TypeScript strict; gestione errori API (rate limit, timeout) con fallback puliti in UI; `next build` ok.

---

## 9. Deliverable di questo prompt

1. `src/lib/ai/coach.ts` + `prompts.ts` + `config/ai.ts`: integrazione API Anthropic lato server, modello configurabile, streaming.
2. Funzione A — spiegazione mossa, ancorata ai dati del motore, con caching in `ai_comment` e generazione parsimoniosa; integrata nella revisione partita.
3. Funzione B — Q&A sulla posizione, con il motore che fornisce i numeri prima che il modello spieghi.
4. Funzione C — metriche deterministiche su `user_progress` + sintesi AI in JSON dei pattern d'errore, esposta nel profilo.
5. Voce "Coach" attivata nella sidebar (anche solo come accesso alla revisione/sintesi per ora).

**Quando hai finito, fermati.** Le tattiche (puzzle + ripetizione spaziata) sono il prompt `05`, che chiude l'MVP.
