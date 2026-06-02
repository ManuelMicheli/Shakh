# PROMPT 10 — GDPR, i18n, SEO, performance e deploy

> **Progetto:** Shakh — piattaforma di apprendimento scacchistico
> **Prerequisiti:** prompt `00`–`09` completati (prodotto funzionante end-to-end). Font già self-hosted dal `00`; coach AI server-side dal `04`; API Lichess dal `03`/`06`; layer istruttore con dati di terzi dal `09`.
> **Questo prompt:** l'ultimo. Rende l'app **pubblicabile e conforme** (GDPR/Garante), internazionalizzabile, indicizzabile, veloce, sicura e deployata su Vercel. **NON** aggiunge feature di prodotto.

> **Nota:** Iubenda genera i testi, ma le scelte sostanziali (basi giuridiche, sub-processori, gestione minori) vanno **validate legalmente**: questo prompt predispone l'infrastruttura, non sostituisce la revisione di un legale.

---

## 1. GDPR / Privacy (Garante)

### Processori terzi da dichiarare nell'informativa
- **Anthropic** (API del coach): elabora **posizioni e mosse** (FEN/SAN/valutazioni), **mai** dati personali identificativi (vietato inviare username reali/email nel prompt — già impostato nel `04`). Dichiarare l'uso di un servizio AI di terze parti per l'analisi.
- **Lichess** (explorer, tablebase, import partite): dati di gioco.
- **Supabase** (database/auth): verifica e usa una **region UE**; dichiara come responsabile del trattamento (DPA).
- **Vercel** (hosting), **Resend** (email transazionali/inviti, se attivato nel `09`).

### Cookie banner conforme al Garante
- Banner con **parità** tra "Accetta" e "Rifiuta" (stesso rilievo, rifiuto in un click); **niente** cookie wall, **niente** scroll/continuazione come consenso, preselezioni disattivate.
- Categorie con consenso granulare; preferenze riapribili dal footer.
- Se non servono cookie non tecnici (nessun analytics di terze parti), il banner si semplifica: valuta un analytics privacy-friendly o nessuno. Usa Iubenda Cookie Solution per banner + Consent.

### Minori (punto specifico di questa piattaforma)
Una piattaforma per imparare scacchi avrà molti utenti **minorenni**. In Italia la soglia per il consenso digitale autonomo è **14 anni** (art. 8 GDPR + Codice Privacy).
- Raccogli la **data di nascita / fascia d'età** alla registrazione.
- Sotto i 14 anni: prevedi il **consenso genitoriale** (flusso dedicato; base giuridica e modalità da validare legalmente).
- Per i minori gestiti tramite **circolo/scuola** (`09`), chiarisci base giuridica e ruolo dell'ente; l'allievo (o il genitore) deve sapere che l'istruttore vede i progressi — **trasparenza esplicita al momento del join clickwrap** del `09`.

### Diritti dell'interessato
- **Cancellazione account**: elimina `profiles` con cancellazione a cascata di tutti i dati collegati (le FK `on delete cascade` del `00` aiutano; verifica la copertura).
- **Export dati**: l'utente può esportare i propri dati (partite, progressi, repertori) in formato leggibile (JSON/PGN).
- Pagine legali: `/privacy`, `/cookie-policy`, `/termini` (Iubenda), linkate nel footer.

---

## 2. Font self-hosted & header di sicurezza (CSP)

- **Verifica** che tutti i font siano serviti dal nostro dominio (`next/font`), **nessuna** chiamata a Google Fonts (requisito Garante, già impostato nel `00`).
- **CSP** in `next.config` (o middleware con nonce per gli script Next):
  - `script-src`: `'self'` + nonce; includi `'wasm-unsafe-eval'` per Stockfish WASM.
  - `worker-src`: `'self' blob:` (web worker del motore).
  - `connect-src`: `'self'` + `https://explorer.lichess.ovh` + `https://tablebase.lichess.ovh` + `https://lichess.org` + l'URL Supabase (+ Iubenda se necessario). L'API Anthropic è **server-side**, non va nel connect-src del client.
  - `font-src 'self'`, `img-src` (self + data: per gli SVG), `style-src` (gestisci l'inline con nonce o hash).
- **NON** aggiungere `COOP`/`COEP` (resta la build Stockfish lite-single decisa nel `02`).
- Altri header: `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `frame-ancestors 'none'`, `Permissions-Policy` restrittiva.

---

## 3. Internazionalizzazione (i18n)

- **Italiano lingua di default.** Estrai le stringhe UI in file di traduzione (es. `next-intl`); struttura pronta per aggiungere lingue (EN) senza rifattorizzare.
- La locale dell'utente (`profiles.locale`) guida UI e formattazione date/numeri.
- Il coach (`04`) risponde in italiano; se in futuro si aggiungono lingue, la lingua di risposta segue `profiles.locale` (predisponi il parametro, non implementare altre lingue ora).

---

## 4. SEO / Schema.org

### Landing marketing (rifai il placeholder del `00`)
Costruisci la vera landing pubblica, **livello Awwwards** (usa GSAP/Framer Motion/Lenis già in stack e segui i principi di design del progetto), che comunichi il prodotto e soprattutto **l'angolo differenziante: il coach AI in italiano che spiega il *perché***. Sezioni: hero con la promessa (principiante → giocatore di club), come funziona (analisi delle tue partite, percorso guidato, teoria interattiva, tattiche, trappole), il coach in evidenza, CTA registrazione. Identità bianco/nero.

### Tecnico
- **Metadata API** di Next su tutte le pagine pubbliche (title, description, Open Graph, Twitter card, immagini OG).
- **JSON-LD**: `WebApplication`/`SoftwareApplication` per l'app; se esponi lezioni/contenuti pubblici indicizzabili, `Course`/`LearningResource`; `Organization` per il brand.
- `sitemap.xml` e `robots.txt` (genera dinamicamente); `canonical` sulle pagine pubbliche.
- **Le pagine sotto `/app` sono private → `noindex`**; indicizza solo landing e contenuti pubblici scelti.

---

## 5. Performance (Core Web Vitals)

- **Stockfish**: già lazy nel worker (`02`); assicurati che il WASM non entri nel bundle iniziale.
- **Code splitting**: `dynamic(..., { ssr:false })` per chessground/board, `MoveTree`, grafici; carica i moduli pesanti solo nelle rotte che li usano.
- **Asset**: `next/image` per le immagini; preload dei font critici; ottimizza gli sprite dei pezzi.
- **Caching**: explorer/tablebase già cachati (`06a`); aggiungi cache HTTP dove sensato; revalidate sui contenuti.
- Esegui un'analisi del bundle e punta a Core Web Vitals verdi sulle pagine pubbliche (sull'app, accetta che il caricamento del motore sia on-demand).

---

## 6. Sicurezza e controllo abusi/costi

- **Rate limiting** sulle route API, **in particolare quelle che chiamano Anthropic** (sono la voce di costo e il bersaglio di abusi): limiti per-utente e per-IP (es. Upstash/Vercel KV). Senza questo, un utente malizioso può farti esplodere la bolletta del coach.
- **Chiavi**: `ANTHROPIC_API_KEY` solo server-side; `SUPABASE_SERVICE_ROLE_KEY` mai esposta al client né usata per aggirare RLS (ribadito dal `09`).
- **Validazione input**: sanifica FEN/PGN/UCI prima di passarli a motore/AI/DB; le server action e le route verificano sempre la sessione.
- **RLS**: verifica finale che tutte le tabelle con dati personali abbiano policy attive e corrette, con attenzione speciale agli accessi istruttore→allievo del `09`.

---

## 7. Deploy su Vercel

- **Env di produzione**: le 5 chiavi del `00` + eventuali (`RESEND_API_KEY`, store del rate limit, ID Iubenda). `.env.local` mai committato.
- **Runtime**: le route che usano l'SDK Anthropic girano in **Node runtime** (non edge).
- **Stockfish**: file in `public/engine/` serviti con MIME corretto (`.wasm` → `application/wasm`); verifica in produzione.
- **Supabase**: migration applicate in produzione, **region UE**, RLS verificata.
- **Dominio/HTTPS**: redirect `www`↔apex coerente, HSTS attivo.
- **Checklist pre-lancio**: build pulita, header di sicurezza presenti (verifica con uno scanner), CSP che non rompe motore/worker/explorer, font tutti locali, pagine `/app` in `noindex`, cancellazione/export account funzionanti, rate limit attivo sul coach.

---

## 8. Deliverable di questo prompt

1. Iubenda (privacy/cookie/termini) + cookie banner conforme Garante (parità, no wall); pagine legali e footer.
2. Gestione minori (età alla registrazione, consenso genitoriale <14, trasparenza per i circoli) e diritti interessato (cancellazione a cascata + export dati).
3. CSP e header di sicurezza completi in `next.config`; verifica font self-hosted; nessun COOP/COEP.
4. i18n con italiano di default e struttura multilingua; locale utente che guida UI/formati.
5. Landing marketing livello Awwwards (angolo coach AI) + metadata, JSON-LD, sitemap, robots, `noindex` su `/app`.
6. Ottimizzazioni performance (lazy WASM, code splitting, asset, caching) verso Core Web Vitals.
7. Rate limiting sulle route AI + hardening (chiavi, validazione input, verifica RLS finale).
8. Configurazione e checklist di deploy Vercel (runtime Node per le route AI, MIME WASM, Supabase UE).

**Con questo la suite è completa.** L'app è costruita, conforme e pronta al deploy.
