import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { BRAND_NAME } from "@/config/brand";
import { BrandMark } from "./BrandMark";
import { ConsentPreferencesButton } from "@/components/consent/ConsentPreferencesButton";

/**
 * Footer pubblico: tagline, link legali (Iubenda → qui pagine interne) e
 * riapertura preferenze cookie (requisito Garante). Anno calcolato a render.
 */
export async function SiteFooter() {
  const t = await getTranslations("footer");
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border px-6 py-12 md:px-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 md:flex-row md:items-start md:justify-between">
        <div className="max-w-xs">
          <span className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
            <BrandMark className="h-5 w-5 shrink-0" />
            {BRAND_NAME}
          </span>
          <p className="mt-2 text-sm text-text-muted">{t("tagline")}</p>
        </div>

        <nav aria-label={t("legal")} className="flex flex-col gap-2 text-sm">
          <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
            {t("legal")}
          </span>
          <Link href="/privacy" className="text-text-muted hover:text-text">
            {t("privacy")}
          </Link>
          <Link href="/cookie-policy" className="text-text-muted hover:text-text">
            {t("cookie")}
          </Link>
          <Link href="/termini" className="text-text-muted hover:text-text">
            {t("terms")}
          </Link>
          <ConsentPreferencesButton label={t("managePreferences")} />
        </nav>
      </div>

      <p className="mx-auto mt-10 max-w-5xl text-xs text-text-muted">
        © {year} {BRAND_NAME}. {t("rights")}
      </p>
    </footer>
  );
}
