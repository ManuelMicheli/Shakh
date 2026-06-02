# Deploy — checklist pre-lancio (prompt 10, §7–§8)

Riferimento operativo per portare Shakh in produzione su Vercel in modo
conforme e sicuro. Il codice predispone tutto; le voci con `[ ]` sono azioni da
fare sull'account/infra.

## Env di produzione (Vercel → Project Settings → Environment Variables)
- [ ] `NEXT_PUBLIC_SUPABASE_URL` — progetto Supabase **region UE**
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` — solo server, mai esposta al client
- [ ] `ANTHROPIC_API_KEY` — solo server (route coach in Node runtime)
- [ ] `NEXT_PUBLIC_APP_URL` — dominio di produzione (es. `https://shakh.app`)
- [ ] `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` — rate limit coach
      (se assenti il limiter è no-op: **NON** lasciarli vuoti in produzione)
- [ ] `RESEND_API_KEY` — email/inviti (se attivo il `09`)

`.env.local` non è mai committato (vedi `.gitignore`).

## Runtime
- Le route che usano l'SDK Anthropic dichiarano `export const runtime = "nodejs"`
  (`src/app/api/coach/*`). Verificato: **non** girano su edge.

## Stockfish / WASM
- `public/engine/` è popolato al build da `scripts/copy-engine.mjs`
  (hook `prebuild`/`postinstall`).
- MIME `application/wasm` forzato in `next.config.ts` (`headers()`).
- [ ] Verifica in produzione che `/engine/*.wasm` risponda con
      `Content-Type: application/wasm` e che il worker carichi (no COOP/COEP).

## Supabase
- [ ] Applica le migration `supabase/migrations/0001`→`0012` in produzione
      (`supabase db push` o SQL editor).
- [ ] Conferma **region UE**.
- [ ] RLS attiva su tutte le tabelle con dati personali; verifica gli accessi
      istruttore→allievo del `09` (`is_group_instructor_of`).

## Sicurezza / header
- CSP con nonce per richiesta nel middleware (`src/lib/security/csp.ts`);
  header statici (HSTS, nosniff, Referrer-Policy, X-Frame-Options,
  Permissions-Policy) in `next.config.ts`.
- [ ] Scansiona il dominio (es. securityheaders.com / Mozilla Observatory) e
      verifica che CSP non rompa motore/worker/explorer Lichess/Supabase.

## Dominio / HTTPS
- [ ] Redirect `www` ↔ apex coerente.
- [ ] HTTPS + HSTS attivi (header già impostato; `preload` opzionale).

## Verifiche funzionali finali
- [ ] Build pulita (`npm run build`).
- [ ] Font tutti locali (`next/font`, nessuna chiamata a Google Fonts a runtime).
- [ ] Pagine `/app` in `noindex`; `sitemap.xml` e `robots.txt` corretti.
- [ ] Cookie banner: parità Accetta/Rifiuta, riapribile dal footer, nessuna
      preselezione delle categorie non necessarie.
- [ ] Esportazione dati e cancellazione account funzionanti.
- [ ] Rate limit attivo sulle route coach (con Upstash configurato).

## Nota legale
Le pagine `/privacy`, `/cookie-policy`, `/termini` sono bozze strutturate: far
**validare da un legale** basi giuridiche, sub-processori e gestione minori
(consenso genitoriale <14) prima del lancio.
