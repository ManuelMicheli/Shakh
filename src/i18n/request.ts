import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { defaultLocale, isLocale, LOCALE_COOKIE } from "./config";

/**
 * Risoluzione della locale per richiesta (senza routing nell'URL).
 * Priorità: cookie NEXT_LOCALE (allineato a profiles.locale dal profilo/login)
 * → default italiano. I messaggi vengono caricati dal bundle corrispondente.
 */
export default getRequestConfig(async () => {
  const cookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale = isLocale(cookie) ? cookie : defaultLocale;
  const messages = (await import(`../messages/${locale}.json`)).default;

  return {
    locale,
    messages,
    // Formattazione date/numeri guidata dalla locale utente (§3).
    timeZone: "Europe/Rome",
    formats: {
      dateTime: {
        short: { day: "numeric", month: "short", year: "numeric" },
      },
    },
  };
});
