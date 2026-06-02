import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

/**
 * Sitemap dinamica (prompt 10, §4). Solo pagine pubbliche indicizzabili:
 * le rotte sotto /app sono private (noindex) e non compaiono qui.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteConfig.url.replace(/\/$/, "");
  const routes = ["", "/login", "/signup", "/privacy", "/cookie-policy", "/termini"];
  return routes.map((path) => ({
    url: `${base}${path}`,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.5,
  }));
}
