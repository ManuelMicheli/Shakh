import type { Metadata } from "next";
import { LegalShell } from "@/components/legal/LegalShell";

export const metadata: Metadata = {
  title: "Informativa sulla privacy",
  description:
    "Come Shakh tratta i dati personali: finalità, basi giuridiche, responsabili del trattamento, minori e diritti dell'interessato.",
};

// Bozza strutturata: i contenuti sostanziali (basi giuridiche, sub-processori,
// gestione minori) vanno validati da un legale prima della pubblicazione.
export default function PrivacyPage() {
  return (
    <LegalShell title="Informativa sulla privacy" updated="giugno 2026">
      <p>
        La presente informativa descrive il trattamento dei dati personali degli
        utenti di Shakh ai sensi del Regolamento (UE) 2016/679 (GDPR) e del
        Codice Privacy italiano. Bozza da sottoporre a revisione legale.
      </p>

      <h2>Titolare del trattamento</h2>
      <p>
        [Ragione sociale / titolare], [indirizzo], contatto privacy:
        [email]. Eventuale DPO: [contatto].
      </p>

      <h2>Dati trattati e finalità</h2>
      <ul>
        <li>
          Dati di account (email, nome visualizzato, username): autenticazione e
          gestione del profilo.
        </li>
        <li>
          Dati di gioco e di studio (partite importate, progressi, repertori,
          tentativi su puzzle): erogazione del servizio e personalizzazione del
          percorso.
        </li>
        <li>
          Data di nascita / fascia d&apos;età: verifica del consenso digitale e
          gestione degli utenti minorenni (vedi sotto).
        </li>
      </ul>

      <h2>Responsabili del trattamento (sub-processori)</h2>
      <ul>
        <li>
          <strong>Supabase</strong> — database e autenticazione, su region UE
          (DPA in essere).
        </li>
        <li>
          <strong>Vercel</strong> — hosting dell&apos;applicazione.
        </li>
        <li>
          <strong>Anthropic</strong> — servizio AI di terze parti per l&apos;analisi:
          elabora esclusivamente posizioni e mosse (FEN/SAN/valutazioni),
          <strong> mai</strong> dati personali identificativi.
        </li>
        <li>
          <strong>Lichess</strong> — statistiche di apertura, tablebase e import
          partite (dati di gioco).
        </li>
        <li>
          <strong>Resend</strong> — invio di email transazionali e inviti (se
          attivo).
        </li>
      </ul>

      <h2>Minori</h2>
      <p>
        In Italia la soglia per il consenso digitale autonomo è di 14 anni.
        Raccogliamo la data di nascita in fase di registrazione. Per gli utenti
        sotto i 14 anni è previsto il consenso del genitore/tutore. Per i minori
        gestiti tramite circolo o scuola, l&apos;ente è informato del proprio ruolo
        e l&apos;allievo (o il genitore) è reso edotto che l&apos;istruttore può
        visualizzarne i progressi.
      </p>

      <h2>Diritti dell&apos;interessato</h2>
      <p>
        Puoi accedere, rettificare, esportare e cancellare i tuoi dati. Dal tuo
        profilo trovi l&apos;<strong>esportazione dati</strong> (formato JSON/PGN) e
        la <strong>cancellazione dell&apos;account</strong>, che elimina in modo
        definitivo profilo e dati collegati. Hai inoltre diritto di reclamo al
        Garante per la protezione dei dati personali.
      </p>

      <h2>Conservazione</h2>
      <p>
        I dati sono conservati per il tempo necessario all&apos;erogazione del
        servizio e cancellati su richiesta o alla chiusura dell&apos;account.
      </p>
    </LegalShell>
  );
}
