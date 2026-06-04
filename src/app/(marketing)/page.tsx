import type { Metadata } from "next";
import { Landing } from "@/components/marketing/Landing";
import { SiteFooter } from "@/components/layout/site-footer";
import { JsonLd } from "@/components/seo/JsonLd";
import { organizationLd, webApplicationLd } from "@/lib/seo/jsonld";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  // Landing pubblica: indicizzabile (default index/follow).
  alternates: { canonical: "/" },
  openGraph: {
    title: `${siteConfig.name} — your chess coach`,
    description: siteConfig.description,
    url: siteConfig.url,
  },
};

export default function MarketingPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <JsonLd data={[organizationLd(), webApplicationLd()]} />
      <Landing />
      <SiteFooter />
    </div>
  );
}
