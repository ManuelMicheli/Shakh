import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "@/styles/globals.css";
import { archivo, jetbrainsMono } from "./fonts";
import { siteConfig } from "@/config/site";
import {
  ThemeProvider,
  themeInitScript,
} from "@/components/providers/theme-provider";
import { LenisProvider } from "@/components/providers/lenis-provider";
import { ToastProvider } from "@/components/ui/toast";
import { ConsentProvider } from "@/components/consent/ConsentProvider";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";
import { PWA_BG } from "@/lib/pwa/render-icon";
import { installCaptureScript } from "@/lib/pwa/install-capture";

export const viewport: Viewport = {
  themeColor: PWA_BG,
  // L'app installata copre la status bar / notch: layout a tutto schermo.
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s · ${siteConfig.name}`,
  },
  description: siteConfig.description,
  metadataBase: new URL(siteConfig.url),
  applicationName: siteConfig.name,
  // PWA: <link rel="manifest"> e meta apple iniettati da Next.
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: siteConfig.name,
    statusBarStyle: "black-translucent",
  },
  openGraph: {
    type: "website",
    siteName: siteConfig.name,
    locale: siteConfig.locale,
    title: siteConfig.name,
    description: siteConfig.description,
    url: siteConfig.url,
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.description,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Nonce della richiesta corrente (impostato dal middleware) per firmare lo
  // script inline anti-FOUC sotto CSP strict.
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={`${archivo.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Anti-FOUC: applica il tema prima del paint. */}
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
        {/* Cattura beforeinstallprompt prima dell'idratazione (PWA install). */}
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: installCaptureScript }}
        />
      </head>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider>
            <ToastProvider>
              <ConsentProvider>
                <LenisProvider>{children}</LenisProvider>
                <ServiceWorkerRegister />
              </ConsentProvider>
            </ToastProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
