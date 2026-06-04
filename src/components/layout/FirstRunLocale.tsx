"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { setLocalePreference } from "@/app/app/profilo/actions";
import type { Locale } from "@/i18n/config";

/**
 * Prompt di scelta lingua al primo accesso. Si mostra finché l'utente non ha
 * scelto (profiles.locale_chosen = false). Copia bilingue: l'utente non sa
 * ancora quale lingua è attiva. La scelta imposta il cookie NEXT_LOCALE + il
 * profilo e ricarica i Server Component così la lingua si applica subito.
 */
export function FirstRunLocale({ localeChosen }: { localeChosen: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(!localeChosen);
  const [pending, start] = useTransition();

  const choose = (locale: Locale) => {
    if (pending) return;
    start(async () => {
      await setLocalePreference(locale);
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <Dialog
      open={open}
      // Non si chiude senza scegliere: una scelta è obbligatoria.
      onOpenChange={() => {}}
      title="Lingua · Language"
      description="Scegli la lingua dell'app. · Choose the app language."
    >
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Button onClick={() => choose("it")} disabled={pending}>
          Italiano
        </Button>
        <Button onClick={() => choose("en")} disabled={pending}>
          English
        </Button>
      </div>
    </Dialog>
  );
}
