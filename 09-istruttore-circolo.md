# PROMPT 09 — Layer istruttore / circolo

> **Progetto:** Shakh — piattaforma di apprendimento scacchistico
> **Prerequisiti:** prompt `00`–`08` completati. Usa: `groups`, `group_members`, `assignments`, `profiles.role`, la funzione RLS `is_group_instructor_of` e le policy "istruttore in lettura sui membri" dal `00`; `repertoires.owner_group_id` dal `00`/`06b`; le aggregazioni `aggregate.ts` e la libreria `components/progress/` dall'`08`; la sintesi del coach (Funzione C) dal `04`; `user_path_progress` dal `07`.
> **Questo prompt:** attiva lo **Strato 1** (B2B). È una **vista aggregata** del core, non un nuovo prodotto: gestione gruppi/circoli, **dashboard di classe**, **assegnazioni**. Riusa tutto ciò che esiste.
> **NON fare:** GDPR/consenso/SEO/deploy (è il `10`). Non rifare i moduli core né duplicare le aggregazioni dell'`08`.

---

## 1. Principio e sicurezza (leggere prima)

Lo Strato 1 aggiunge **relazioni + dashboard**, non logica di prodotto. La regola di sicurezza è la più delicata di tutta la suite: qui si leggono **dati di terze persone** (gli allievi).

- L'istruttore accede **solo in lettura** ai dati dei membri dei **propri** gruppi, tramite le policy RLS già impostate nel `00` (`is_group_instructor_of`). Ogni nuova query lato istruttore deve passare da RLS: niente scorciatoie con la service role key per aggirare i controlli.
- Verifica `is_group_instructor_of` su **ogni** vista/azione che tocca dati altrui.
- La trasparenza verso l'allievo (sapere che l'istruttore vede i suoi progressi) e il consenso sono materia del `10`; qui predisponi, ma non improvvisare informative.

---

## 2. Migration additiva

```sql
-- Inviti ai gruppi (join via codice/link)
create table group_invites (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  code text unique not null,
  email text,                          -- opzionale (invito mirato)
  role_in_group group_member_role not null default 'member',
  expires_at timestamptz,
  used_by uuid references profiles(id),
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index on group_invites (code);

-- Generalizzazione delle assegnazioni: oltre alle lezioni, anche puzzle-set, finali, trappole, repertori, nodi percorso
alter table assignments add column ref_type text;     -- 'lesson'|'puzzle_set'|'endgame'|'trap'|'repertoire'|'path_node'
alter table assignments add column ref_id uuid;        -- id della risorsa (nullable per puzzle_set)
alter table assignments add column params jsonb;       -- es. {theme:'fork', count:20} per i puzzle-set
```
RLS: `group_invites` gestiti dall'owner/instructor del gruppo; leggibili da chi possiede il codice per il join. Le nuove colonne di `assignments` ereditano le policy esistenti.

---

## 3. Gestione gruppi / circoli

- **Creazione**: un utente crea un gruppo (`groups`: nome, tipo circolo/classe/scuola, slug) e ne diventa `owner` in `group_members`. Creare un gruppo abilita le funzioni istruttore **per quel gruppo** (il gating commerciale — chi può creare circoli a pagamento — è una scelta di monetizzazione, fuori da questo prompt).
- **Inviti**: genera un **codice/link** d'invito (`group_invites`) con ruolo e scadenza; opzionalmente legato a un'email. Join via `/app/join/[code]` con clickwrap (l'allievo accetta di entrare nel gruppo). L'invito via email è predisposto ma l'invio effettivo (Resend) è del `10`.
- **Membri e ruoli**: `owner` / `instructor` / `member`. L'owner può promuovere a `instructor`, rimuovere membri, revocare inviti.
- Pagine: `/app/gruppi` (i miei gruppi, come membro e come istruttore), `/app/gruppi/[id]` (membri, inviti, impostazioni).

---

## 4. Dashboard di classe (istruttore)

Riusa **le stesse aggregazioni dell'`08`** (`aggregate.ts`) e gli **stessi componenti** (`components/progress/`), applicati ai membri del gruppo. Nessuna nuova logica di calcolo dei progressi.

- **`/app/gruppi/[id]/classe`** (solo istruttore): elenco allievi con metriche chiave (rating tattico, livello nel percorso, ultima attività, accuratezza media), ordinabile; chi è indietro / chi è avanti.
- **Vista aggregata di classe**: punti deboli **comuni** (i temi in cui più allievi sono sotto soglia → *"5 allievi su 8 deboli nei finali di torre"*), distribuzione delle competenze, heatmap classe per area.
- **Drill-down allievo** — `/app/gruppi/[id]/allievi/[userId]`: la dashboard dell'allievo in **sola lettura** (riusa i componenti dell'`08`), accessibile solo se `is_group_instructor_of`.
- Le partite del singolo allievo sono visibili all'istruttore secondo le policy del `00`; presentalo come contesto didattico. Ogni accesso resta vincolato a RLS.

---

## 5. Assegnazioni

L'istruttore assegna attività a un **singolo allievo** o all'**intera classe** (`target_type` user/group dal `00`), usando le colonne generalizzate (§2):

- una **lezione** (`ref_type='lesson'`, `ref_id`=content_item), una **pratica di finale**, una **trappola** (`06d`), un **set di puzzle** (`ref_type='puzzle_set'`, `params={theme,count}`), un **repertorio** di gruppo, o un **nodo del percorso**.
- con `note` e `due_at`; stato `assigned → in_progress → completed`.
- **Completamento automatico dove possibile**: riusa l'**engine dei requisiti del `07`** per derivare il completamento dai progressi reali (es. il puzzle-set è completo quando i tentativi soddisfano `params`); altrimenti l'allievo può segnarla fatta.
- **Lato allievo**: una sezione "Assegnato dal tuo istruttore" nella dashboard (`08`) e/o nel percorso (`07`), con attività, scadenze e stato. Le assegnazioni si integrano nel flusso normale (cliccando, l'allievo finisce nel modulo giusto).
- Pagina istruttore: `/app/gruppi/[id]/assegnazioni` per creare/monitorare.

---

## 6. Repertori di gruppo

Il `06b` ha già `repertoires.owner_group_id`. L'istruttore crea un **repertorio di gruppo** ("nel nostro circolo giochiamo così"): riusa l'editor del `06b`. Assegnandolo, gli allievi lo allenano con il trainer del `06b` (il loro `repertoire_training` resta per-utente). Nessuna nuova logica di drill: solo proprietà di gruppo + assegnazione.

---

## 7. Riassunto di classe (riusa il coach)

Funzione che produce all'istruttore una sintesi in italiano dei punti deboli aggregati della classe (*"la classe è solida in tattica ma debole nei finali; conviene una lezione sui finali di torre"*). Riusa la **Funzione C del `04`**: le metriche aggregate di gruppo sono **deterministiche** (dall'aggregazione dei membri), il modello produce **solo** la frase di sintesi sui dati forniti. Nessuna nuova logica AI, stesso principio "il dato è dato".

---

## 8. Navigazione e visibilità

- Voce "Circoli/Gruppi" in sidebar (sempre visibile; per chi non ne ha, invita a crearne o unirsi).
- Le viste istruttore (classe, drill-down, assegnazioni) appaiono solo a chi è `instructor`/`owner` del gruppo.
- Attiva la sezione "gruppi" del profilo (predisposta nell'`08`).

---

## 9. Qualità e vincoli

- **RLS su tutto**: ogni accesso a dati altrui verificato con `is_group_instructor_of`; mai aggirare con service role.
- Riuso integrale di `aggregate.ts` e `components/progress/` (`08`) e dell'engine requisiti (`07`); nessuna duplicazione.
- Riuso dell'editor/trainer repertori (`06b`) e del coach (`04`) senza nuova logica.
- Inviti con scadenza e revoca; codici non indovinabili.
- Identità bianco/nero, colori solo per esiti; TypeScript strict; `next build` pulito; responsive e doppio tema.

---

## 10. Deliverable di questo prompt

1. Migration `group_invites` + generalizzazione `assignments` (ref_type/ref_id/params) + RLS.
2. Gestione gruppi: creazione, inviti via codice/link con join clickwrap (`/app/join/[code]`), membri e ruoli.
3. Dashboard di classe (`/app/gruppi/[id]/classe`) e drill-down allievo in sola lettura, riusando aggregazioni e componenti dell'`08`.
4. Assegnazioni generalizzate (lezione/puzzle-set/finale/trappola/repertorio/nodo percorso) a singolo o classe, con completamento derivato dall'engine del `07`; vista allievo integrata.
5. Repertori di gruppo (riuso `06b`) e riassunto di classe (riuso coach `04`).
6. Voci e visibilità condizionali in sidebar/profilo.

**Quando hai finito, fermati.** GDPR/Iubenda, i18n, SEO, performance e deploy sono il prompt `10`, l'ultimo.
