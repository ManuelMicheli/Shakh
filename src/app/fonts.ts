import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";

/**
 * Font self-hosted: next/font scarica i file al build e li serve dal nostro
 * dominio — nessuna chiamata runtime a Google Fonts (conformità GDPR, §5/§9).
 */

// Display / titoli — font variabile (range pesi completo + asse opsz).
export const fraunces = Fraunces({
  subsets: ["latin"],
  axes: ["opsz"],
  display: "swap",
  variable: "--font-fraunces",
});

// Testo / UI.
export const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

// Notazione scacchistica (SAN, FEN, PGN, ECO, valutazioni) — SEMPRE monospace.
export const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains-mono",
});
