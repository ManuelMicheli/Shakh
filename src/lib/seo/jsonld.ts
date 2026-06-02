import { siteConfig } from "@/config/site";

/**
 * Dati strutturati Schema.org (prompt 10, §4) per la landing pubblica.
 * Organization per il brand + WebApplication per il prodotto.
 */
export function organizationLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    url: siteConfig.url,
    description: siteConfig.description,
  };
}

export function webApplicationLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: siteConfig.name,
    url: siteConfig.url,
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    inLanguage: "it",
    description: siteConfig.description,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
    },
  };
}
