import { getLocale } from "next-intl/server";
import { isLocale, defaultLocale, type Locale } from "@/i18n/config";

/**
 * Locale attiva lato server (Server Component / Server Action / Route Handler),
 * validata. Risolta da next-intl (cookie NEXT_LOCALE → default).
 */
export async function activeLocale(): Promise<Locale> {
  const l = await getLocale();
  return isLocale(l) ? l : defaultLocale;
}

/**
 * Sceglie il valore localizzato fra le colonne `_it` / `_en` dei contenuti
 * seedati (schema bilingue della migrazione 0021), con fallback all'altra
 * lingua quando una manca (es. i body esistono solo in italiano).
 */
export function pickLocale<T>(
  it: T | null | undefined,
  en: T | null | undefined,
  locale: Locale,
): T | null {
  const primary = locale === "it" ? it : en;
  const fallback = locale === "it" ? en : it;
  return (primary ?? fallback) ?? null;
}
