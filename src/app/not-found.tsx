import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { BRAND_NAME } from "@/config/brand";

/**
 * 404 brandizzata: sostituisce il template anonimo di Next con la voce
 * editoriale del prodotto. Renderizzata dentro il root layout (tema, font,
 * provider già attivi).
 */
export default async function NotFound() {
  const t = await getTranslations("notFound");
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-16 items-center px-6 md:px-10">
        <Link
          href="/"
          className="font-display text-xl font-semibold tracking-tight"
        >
          {BRAND_NAME}
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-start justify-center px-6 py-16">
        <p className="font-mono text-sm text-text-muted">{t("eyebrow")}</p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight">
          {t("title")}
        </h1>
        <p className="mt-3 text-text-muted">{t("desc")}</p>
        <Link
          href="/"
          className="mt-8 inline-flex h-10 items-center rounded-md bg-[var(--accent)] px-5 text-sm font-medium text-[var(--accent-contrast)]"
        >
          {t("home")}
        </Link>
      </main>
    </div>
  );
}
