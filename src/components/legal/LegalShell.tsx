import Link from "next/link";
import { useTranslations } from "next-intl";
import { BRAND_NAME } from "@/config/brand";
import { SiteFooter } from "@/components/layout/site-footer";

/**
 * Cornice delle pagine legali: header minimale + contenuto in colonna leggibile
 * + footer condiviso. Il contenuto è testo strutturato, da validare legalmente
 * (e/o sostituibile con embed Iubenda) — vedi prompt 10, §1.
 */
export function LegalShell({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  const t = useTranslations("legal");
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-16 items-center justify-between px-6 md:px-10">
        <Link
          href="/"
          className="font-display text-xl font-semibold tracking-tight"
        >
          {BRAND_NAME}
        </Link>
        <Link
          href="/login"
          className="text-sm text-text-muted hover:text-text"
        >
          {t("signIn")}
        </Link>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          {title}
        </h1>
        <p className="mt-2 text-sm text-text-muted">{t("lastUpdated", { date: updated })}</p>
        <div className="mt-8 space-y-6 text-sm leading-relaxed text-text [&_h2]:font-display [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-text [&_h2]:mt-2 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&_a]:underline [&_a]:underline-offset-2 [&_p]:text-text-muted [&_li]:text-text-muted">
          {children}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
