import type { Metadata } from "next";
import { LegalShell } from "@/components/legal/LegalShell";

export const metadata: Metadata = {
  title: "Termini di servizio",
  description: "Termini e condizioni d'uso della piattaforma Shakh.",
};

// Bozza strutturata da validare legalmente.
export default function TerminiPage() {
  return (
    <LegalShell title="Termini di servizio" updated="giugno 2026">
      <p>
        Utilizzando Shakh accetti i presenti termini. Bozza da sottoporre a
        revisione legale.
      </p>

      <h2>Il servizio</h2>
      <p>
        Shakh è una piattaforma di apprendimento scacchistico con analisi
        assistita da intelligenza artificiale. Le spiegazioni del coach hanno
        finalità didattica e sono ancorate ai dati del motore: non costituiscono
        garanzia di risultato.
      </p>

      <h2>Account</h2>
      <p>
        Sei responsabile della riservatezza delle credenziali. Gli utenti sotto i
        14 anni necessitano del consenso di un genitore o tutore.
      </p>

      <h2>Uso accettabile</h2>
      <ul>
        <li>Non tentare di aggirare i limiti tecnici o di abusare delle API.</li>
        <li>Non usare il servizio per scopi illeciti o lesivi di terzi.</li>
      </ul>

      <h2>Contenuti di terze parti</h2>
      <p>
        Le statistiche e i dati di gioco provengono da Lichess secondo i relativi
        termini. L&apos;analisi AI è fornita tramite Anthropic.
      </p>

      <h2>Limitazione di responsabilità</h2>
      <p>
        Il servizio è fornito &quot;così com&apos;è&quot;. Nei limiti di legge, è
        esclusa ogni responsabilità per danni indiretti derivanti dall&apos;uso.
      </p>

      <h2>Modifiche</h2>
      <p>
        Possiamo aggiornare questi termini; le modifiche rilevanti saranno
        comunicate agli utenti.
      </p>
    </LegalShell>
  );
}
