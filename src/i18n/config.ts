/**
 * Configurazione i18n (prompt 10, §3).
 * Italiano lingua di default; struttura pronta ad aggiungere lingue (EN) senza
 * rifattorizzare. La locale NON è nell'URL: si risolve da cookie/profilo.
 */
export const locales = ["it", "en"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "it";

/** Cookie convenzione next-intl: sincronizzato con profiles.locale. */
export const LOCALE_COOKIE = "NEXT_LOCALE";

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}

/** Locale BCP-47 completa, per formattazione date/numeri. */
export const localeTag: Record<Locale, string> = {
  it: "it-IT",
  en: "en-US",
};
