# Design System — Shakh · "Sala Torneo"

Fonte di verità del design. Creato con /design-consultation (2026-06-10), direzione
approvata su anteprima reale in `/app/sandbox/rebrand` (variante A — Segnale).

## Product Context
- **Cosa è:** piattaforma di apprendimento scacchi in italiano, da principiante a livello club 1800–2200, con coach AI ancorato a Stockfish + dati Lichess.
- **Per chi:** giocatori che vogliono *salire di rating*, non passare il tempo.
- **Categoria:** Lichess (utilitario denso), Chess.com (verde+legno friendly), Chessable (bianco/blu marketing), Aimchess (slate+viola dashboard).
- **Tipo:** web app (App Router) + landing pubblica.

## La cosa memorabile (north star)
> **"Energia competitiva — mi fa venire voglia di giocare e salire di rating."**

Ogni scelta serve questa frase. Il linguaggio è quello dello **sport trasmesso**
(telemetria motorsport, numeri di gara, timing tower), MAI quello dei giochi mobile
(badge, streak, coriandoli, coppe di cartone). Serietà da study tool intatta.

## Aesthetic Direction
- **Direzione:** industrial-sportiva "Sala Torneo" — monocromo *riscaldato* (carbone e carta, mai grigio hex-neutro) + un solo accento incandescente.
- **Decoration level:** intentional — la firma geometrica fa il lavoro, niente texture/pattern.
- **Mood:** il corridoio dietro il palco di un torneo, due minuti prima del round: silenzioso, teso, l'orologio già in moto.
- **Riferimenti:** lichess.org (densità utilitaria), grafica broadcast F1 (telemetria), biglietti/pairing sheet da torneo.

## Typography
- **Display/Hero:** **Archivo** variable, `wdth` 125 ("Expanded"), weight 800–900, MAIUSCOLO, tracking stretto — titoli, rating monumentali, numeri di lega (linguaggio livrea sportiva). Sostituisce Fraunces (il serif diceva "biblioteca", mai "gioca").
- **Body/UI:** **Archivo** variable, `wdth` 100, weight 400–600. Sostituisce Inter. Un solo file variable = performance + coerenza.
- **Data/notazione:** **JetBrains Mono** (regola di prodotto, invariata) — SAN, FEN, PGN, ECO, eval. **Estesa a tutti i numeri vivi**: rating, delta, timer, percentuali, sempre `tabular-nums`. Il mono è la voce della telemetria.
- **Loading:** self-hosted via `next/font` (`src/app/fonts.ts`), `axes: ["wdth"]` — GDPR, nessuna chiamata runtime a Google.
- **Scala:** invariata (`--text-display-*` clamp fluidi in `globals.css`).

## Color
- **Approccio:** restrained — 1 accento + neutri caldi. Il colore è raro e quindi significa.

### Tema dark — "Carbone" (default)
| Token | Hex | Note |
|---|---|---|
| `--bg` | `#0E0D0B` | nero-carbone caldo |
| `--surface` | `#161412` | |
| `--surface-2` | `#1E1B18` | |
| `--text` | `#F2EFE9` | bianco-carta caldo |
| `--text-muted` | `#9A938A` | 6:1 su bg ✓ |
| `--border` | `#2A2622` | |
| `--accent` | `#FF4D00` | arancio segnale |
| `--accent-contrast` | `#0D0C0B` | 5.7:1 su accent ✓ AA |

### Tema light — "Carta da torneo"
| Token | Hex | Note |
|---|---|---|
| `--bg` | `#F5F2EC` | carta, non bianco ospedale |
| `--surface` | `#FFFFFF` | |
| `--surface-2` | `#ECE8E0` | |
| `--text` | `#15130F` | |
| `--text-muted` | `#6B655C` | 5:1 su bg ✓ |
| `--border` | `#D8D2C6` | |
| `--accent` | `#D63A00` | arancio bruciato |
| `--accent-contrast` | `#FFFFFF` | 4.7:1 su accent ✓ AA |

### Disciplina dell'arancio (la disciplina È il design)
- **Sì:** rating e delta (`◢ +12`), CTA primaria "Gioca", posizione in Lega/Campionato, sweep di hover.
- **No:** icone decorative, stati informativi, link generici, sfondi. **Mai più del ~5% di una schermata.**
- L'inversione dark↔light delle azioni primarie è sostituita dall'accento: i bottoni primari usano `--accent`/`--accent-contrast` espliciti.

### Scacchiera — FUORI dal rebranding (decisione utente, 2026-06-10)
Scacchiera e pezzi restano IDENTICI a prima: case fisse bianco `#ffffff` /
grigio `#8b8b8b` in entrambi i temi, pezzi cburnett, highlight neutri tinti
sul testo, radius 4px. Sono "oggetto di studio", già perfetti — non toccarli.

### Semantici eval (SOLO contesto analisi — regola invariata)
Ricalibrati per non collidere con l'accento arancio:
- `--eval-mistake`: `#cf8a4a` → **`#b05c35`** (terracotta)
- `--eval-miss`: `#d76b4d` → **`#bf4f3a`**
- Tutti gli altri (`brilliant #3aa6b9`, `great #5b8bb0`, `book #a88865`, `best #5b9a5e`, `excellent #7aa757`, `good #8a9a6b`, `inaccuracy #c9a24b`, `blunder #c0564a`) invariati.

## Spacing
- **Base unit:** 4px (invariato). **Densità:** comfortable nell'app, spacious sulla landing.
- **Scala:** 2xs(2) xs(4) sm(8) md(16) lg(24) xl(32) 2xl(48) 3xl(64).

## Layout
- **Approccio:** grid-disciplined nell'app (invariato), creative-editorial sulla landing.
- **Border radius:** ~0. Spigoli vivi; l'unico gesto geometrico è il taglio 45°.

## Elemento firma — La Diagonale (45°)
L'angolo dell'alfiere. Un solo gesto geometrico, applicato con monotonia ossessiva:
- **Taglio d'angolo 45°** (`clip-path`, ~10–12px) sull'angolo alto-destro di card primarie e CTA "Gioca" — come un biglietto da torneo obliterato.
- **Delta rating:** chevron 45° `◢ +12` / `◥ -8` (mai frecce su/giù da fintech).
- **Stati vuoti/splash:** una singola hairline diagonale accent da angolo ad angolo.
- Mai diluire: un solo angolo, ovunque, finché diventa il logo de facto.

## Motion
- **Approccio:** intentional. L'accento entra **sempre in wipe a 45°**, mai in fade.
- **Easing:** secco — enter `ease-out`, exit `ease-in`.
- **Durate:** micro 50–100ms · short 150ms (wipe hover) · medium 250–400ms.
- **Vietati:** coriandoli, bounce giocosi, pulsazioni decorative.

## Anti-pattern (mai)
Gradienti viola · badge/streak/coppe gamificate · border-radius bolla · verde scacchiera da categoria · grigi hex-neutri freddi · fade molli sull'accento.

## Stato implementazione
- ✅ Anteprima approvata: `/app/sandbox/rebrand` (dev-only).
- ✅ `globals.css`: token dark/light, eval ricalibrati, radius 0, `.cut-45`, `.btn-wipe`, `.font-display` Expanded.
- ✅ `fonts.ts` + root layout: Archivo (display+UI), Fraunces/Inter rimossi.
- ✅ Button primario + CTA landing: accent, taglio 45°, wipe hover.
- ✅ Scacchiera: VOLUTAMENTE invariata (vedi sopra).
- ✅ Chevron delta `◢`/`◥` in StatTile, RatingCard, GameOverOverlay, Standings (positivo = accento, negativo = attenuato).
- ⚠️ I glifi scacchistici dei watermark (♞/♟, `GlyphWatermark`) NON devono ricevere peso/stile dal brand: la regola `.font-display` resta senza `font-weight` di default proprio per questo (decisione utente: i glifi erano perfetti).

## Decisions Log
| Data | Decisione | Rationale |
|------|-----------|-----------|
| 2026-06-10 | Sistema creato, variante A "Segnale" approvata | /design-consultation: ricerca competitor (Lichess via screenshot; Chess.com/Chessable bloccano headless) + voce esterna subagent; anteprima reale su sandbox; arancio = unico hue libero nella categoria, coerente col north star "energia competitiva" |
| 2026-06-10 | Eval mistake/miss ricalibrati su terracotta | L'accento arancio collideva con la semantica "errore" in analisi |
| 2026-06-10 | Fraunces ritirato, Archivo unico variable | Il serif editoriale contraddice il north star; un solo file variable migliora performance |
| 2026-06-10 | Scacchiera e pezzi esclusi dal rebrand | Decisione utente: "sono perfetti" — case bianco/grigio fisse e cburnett restano identici |
