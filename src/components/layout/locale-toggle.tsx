"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setLocalePreference } from "@/app/app/profilo/actions";
import { cn } from "@/lib/utils";
import { locales, defaultLocale, type Locale } from "@/i18n/config";

/** Locale corrente letta dal cookie NEXT_LOCALE (client-side), con fallback. */
function readCookieLocale(): Locale {
  if (typeof document === "undefined") return defaultLocale;
  const match = document.cookie.match(/(?:^|;\s*)NEXT_LOCALE=([^;]+)/);
  const value = match?.[1];
  return (locales as readonly string[]).includes(value ?? "")
    ? (value as Locale)
    : defaultLocale;
}

/**
 * Toggle lingua IT/EN nella navbar. Imposta il cookie di locale (+ profilo) e
 * ricarica i dati server con la nuova lingua. Cambia la superficie localizzata
 * (landing/footer/consenso) e i formati di date e numeri.
 */
export function LocaleToggle() {
  const router = useRouter();
  const [locale, setLocale] = useState<Locale>(readCookieLocale);
  const [pending, start] = useTransition();

  const choose = (next: Locale) => {
    if (next === locale || pending) return;
    setLocale(next);
    start(async () => {
      await setLocalePreference(next);
      router.refresh();
    });
  };

  return (
    <div
      role="group"
      aria-label="Language"
      className="inline-flex items-center rounded-md border border-border bg-surface p-0.5"
    >
      {(["it", "en"] as Locale[]).map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => choose(code)}
          aria-pressed={locale === code}
          disabled={pending}
          className={cn(
            "rounded px-2 py-0.5 text-xs font-medium uppercase tracking-wide transition-colors",
            locale === code
              ? "bg-text text-bg"
              : "text-text-muted hover:text-text",
          )}
        >
          {code}
        </button>
      ))}
    </div>
  );
}
