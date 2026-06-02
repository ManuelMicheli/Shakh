import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

/**
 * robots.txt dinamico (§4). Le rotte private sotto /app e le API sono escluse
 * dall'indicizzazione; il resto è pubblico. Link alla sitemap.
 */
export default function robots(): MetadataRoute.Robots {
  const base = siteConfig.url.replace(/\/$/, "");
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/app/", "/api/", "/auth/"],
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
