import type { Metadata } from "next";
import "@/styles/globals.css";
import { fraunces, inter, jetbrainsMono } from "./fonts";
import { siteConfig } from "@/config/site";
import {
  ThemeProvider,
  themeInitScript,
} from "@/components/providers/theme-provider";
import { LenisProvider } from "@/components/providers/lenis-provider";
import { ToastProvider } from "@/components/ui/toast";

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s · ${siteConfig.name}`,
  },
  description: siteConfig.description,
  metadataBase: new URL(siteConfig.url),
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang={siteConfig.lang}
      className={`${fraunces.variable} ${inter.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Anti-FOUC: applica il tema prima del paint. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <ThemeProvider>
          <ToastProvider>
            <LenisProvider>{children}</LenisProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
