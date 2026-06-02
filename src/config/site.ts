import { BRAND_NAME } from "./brand";

/**
 * Metadati base del sito. Locale di default: italiano.
 * Struttura predisposta per i18n futuro (prompt 10) senza librerie ora.
 */
export const siteConfig = {
  name: BRAND_NAME,
  description:
    "Shakh — la piattaforma che ti porta da principiante a giocatore di club forte, con un coach AI in italiano che spiega il perché di ogni mossa.",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  locale: "it-IT",
  lang: "it",
} as const;

export type SiteConfig = typeof siteConfig;
