import { Archivo, JetBrains_Mono } from "next/font/google";

/**
 * Font self-hosted: next/font scarica i file al build e li serve dal nostro
 * dominio — nessuna chiamata runtime a Google Fonts (conformità GDPR, §5/§9).
 *
 * Rebranding "Sala Torneo" (DESIGN.md): un'unica variable font per display e
 * UI. Archivo con asse `wdth` 62–125: larghezza normale per la UI, Expanded
 * (wdth 125, weight 800–900) per titoli/rating — linguaggio da livrea sportiva.
 * Sostituisce Fraunces (display) e Inter (UI).
 */
export const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
  variable: "--font-archivo",
});

// Notazione scacchistica (SAN, FEN, PGN, ECO, valutazioni) e tutti i numeri
// vivi (rating, delta, timer) — SEMPRE monospace tabulare.
export const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains-mono",
});
