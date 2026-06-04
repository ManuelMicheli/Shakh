import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { PWA_BG } from "@/lib/pwa/render-icon";

/**
 * Web App Manifest (servito da Next su /manifest.webmanifest, <link> iniettato
 * in automatico). Rende Shakh installabile su desktop (Chrome/Edge) e Android,
 * e "Aggiungi a schermata Home" su iOS. Monocromo coerente col design system.
 *
 * `start_url` apre il prodotto: l'app installata parte dentro /app (il
 * middleware reindirizza a /login se non autenticati). Icone generate da
 * route ImageResponse (vedi src/lib/pwa/render-icon.tsx).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteConfig.name,
    short_name: siteConfig.name,
    description: siteConfig.description,
    lang: siteConfig.lang,
    start_url: "/app",
    scope: "/",
    id: "/",
    display: "standalone",
    orientation: "any",
    background_color: PWA_BG,
    theme_color: PWA_BG,
    categories: ["education", "games"],
    icons: [
      { src: "/icons/icon-192", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/maskable-512",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
