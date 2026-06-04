import { BRAND_NAME } from "./brand";

/**
 * Metadati base del sito. Locale di default: italiano.
 * Struttura predisposta per i18n futuro (prompt 10) senza librerie ora.
 */
export const siteConfig = {
  name: BRAND_NAME,
  description:
    "Shakh — the platform that takes you from beginner to strong club player, with an AI coach that explains the why behind every move.",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  locale: "en-US",
  lang: "en",
} as const;

export type SiteConfig = typeof siteConfig;
