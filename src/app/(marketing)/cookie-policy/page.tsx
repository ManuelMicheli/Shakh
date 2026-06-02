import type { Metadata } from "next";
import { LegalShell } from "@/components/legal/LegalShell";
import { ConsentPreferencesButton } from "@/components/consent/ConsentPreferencesButton";

export const metadata: Metadata = {
  title: "Cookie policy",
  description:
    "I cookie usati da Shakh: tecnici necessari e di preferenza. Nessun tracciamento pubblicitario né profilazione.",
};

export default function CookiePolicyPage() {
  return (
    <LegalShell title="Cookie policy" updated="giugno 2026">
      <p>
        Shakh usa un numero minimo di cookie. Non utilizziamo cookie di
        profilazione pubblicitaria né strumenti di tracciamento di terze parti.
      </p>

      <h2>Cookie tecnici (necessari)</h2>
      <p>
        Indispensabili al funzionamento: sessione di autenticazione (Supabase),
        sicurezza, preferenza di tema e di lingua. Non richiedono consenso e sono
        sempre attivi.
      </p>

      <h2>Cookie di preferenza</h2>
      <p>
        Ricordano scelte non essenziali per migliorare l&apos;esperienza. Vengono
        installati solo previo tuo consenso esplicito e possono essere revocati
        in qualsiasi momento.
      </p>

      <h2>Gestione del consenso</h2>
      <p>
        Al primo accesso un banner ti consente di accettare o rifiutare i cookie
        non necessari con pari evidenza e in un solo click. Puoi rivedere la tua
        scelta quando vuoi:
      </p>
      <p>
        <ConsentPreferencesButton label="Gestisci le preferenze cookie" />
      </p>
    </LegalShell>
  );
}
