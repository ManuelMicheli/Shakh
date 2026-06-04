# App desktop Windows (Tauri)

Shakh desktop è un **guscio nativo** (Tauri 2 + WebView2) che apre il sito di
produzione in una finestra Windows dedicata, con icona nel menu Start. L'app
vera resta server-side (Vercel): il guscio non contiene logica, carica la URL.

Risultato del build: un **installer `.exe`** (NSIS) che chiunque scarica e
lancia per installare "Shakh" come programma Windows.

## URL caricata

Definita in `src-tauri/tauri.conf.json` → `build.frontendDist`. Ora:

```json
"frontendDist": "https://shakh.vercel.app"
```

⚠️ **Verifica che sia il dominio giusto** (aprilo nel browser). Se il dominio
di produzione è un altro, cambia solo questa riga e ricompila.

## Prerequisiti (una tantum, sul PC che compila)

1. **Rust** — https://www.rust-lang.org/tools/install (`rustup`, scegli MSVC).
2. **Microsoft C++ Build Tools** (MSVC) — di solito tirati da rustup; in caso,
   "Desktop development with C++" da Visual Studio Build Tools.
3. **WebView2** — già presente su Windows 10/11 aggiornati.

Verifica: `cargo --version` deve rispondere.

## Build dell'installer

```bash
npm install          # se non già fatto (porta @tauri-apps/cli)
npm run tauri:build  # compila e impacchetta
```

Output:

```
src-tauri/target/release/bundle/nsis/Shakh_0.1.0_x64-setup.exe
```

Quello è il file da distribuire/scaricare. Doppio click → installa Shakh.

## Note

- **Firma codice:** l'installer non è firmato → Windows SmartScreen mostrerà un
  avviso ("Esegui comunque"). Per toglierlo serve un certificato Authenticode
  (a pagamento) configurato in `bundle.windows.certificateThumbprint`.
- **Aggiornamenti contenuto:** essendo un guscio sulla URL live, ogni deploy su
  Vercel aggiorna l'app desktop senza reinstallare. Si reinstalla solo per
  cambiare icona/URL/versione del guscio.
- **Icone:** rigenerabili da `src/app/icon.svg` con `npm run tauri:icon`.
- **Dev veloce:** `npm run tauri -- dev` apre la finestra puntata alla URL.
