"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ACCEPT_ALL,
  DENY_ALL,
  OPEN_CONSENT_EVENT,
  readConsent,
  writeConsent,
  type ConsentState,
} from "@/lib/consent/store";

interface ConsentContextValue {
  consent: ConsentState | null;
  open: () => void;
}

const ConsentContext = createContext<ConsentContextValue>({
  consent: null,
  open: () => {},
});

export function useConsent() {
  return useContext(ConsentContext);
}

export function ConsentProvider({ children }: { children: React.ReactNode }) {
  const t = useTranslations("consent");
  const [consent, setConsent] = useState<ConsentState | null>(null);
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [prefToggle, setPrefToggle] = useState(false); // categoria preferenze, default OFF

  // Prima decisione: mostra il banner solo se non c'è ancora una scelta valida.
  useEffect(() => {
    const existing = readConsent();
    setConsent(existing);
    if (!existing) setVisible(true);
  }, []);

  const open = useCallback(() => {
    const existing = readConsent();
    setPrefToggle(existing?.preferences ?? false);
    setExpanded(true);
    setVisible(true);
  }, []);

  // Riapertura dal footer.
  useEffect(() => {
    const handler = () => open();
    window.addEventListener(OPEN_CONSENT_EVENT, handler);
    return () => window.removeEventListener(OPEN_CONSENT_EVENT, handler);
  }, [open]);

  const decide = useCallback((choice: Omit<ConsentState, "ts">) => {
    const saved = writeConsent(choice);
    setConsent(saved);
    setVisible(false);
    setExpanded(false);
  }, []);

  return (
    <ConsentContext.Provider value={{ consent, open }}>
      {children}
      {visible && (
        <div
          role="dialog"
          aria-modal="false"
          aria-label={t("title")}
          className="fixed inset-x-0 bottom-0 z-[60] border-t border-border bg-surface/95 backdrop-blur"
        >
          <div className="mx-auto max-w-3xl px-5 py-5">
            <h2 className="font-display text-base font-semibold tracking-tight">
              {t("title")}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-text-muted">
              {t("body")}{" "}
              {t("moreInfo")}{" "}
              <Link href="/cookie-policy" className="underline underline-offset-2">
                cookie policy
              </Link>
              .
            </p>

            {expanded && (
              <div className="mt-4 space-y-3">
                <div className="flex items-start justify-between gap-4 rounded-md border border-border px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{t("necessaryTitle")}</p>
                    <p className="mt-0.5 text-xs text-text-muted">
                      {t("necessaryBody")}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-medium text-text-muted">
                    {t("alwaysOn")}
                  </span>
                </div>
                <label className="flex cursor-pointer items-start justify-between gap-4 rounded-md border border-border px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{t("preferencesTitle")}</p>
                    <p className="mt-0.5 text-xs text-text-muted">
                      {t("preferencesBody")}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={prefToggle}
                    onChange={(e) => setPrefToggle(e.target.checked)}
                    className="mt-1 h-4 w-4 shrink-0 accent-[var(--accent)]"
                  />
                </label>
              </div>
            )}

            {/* Parità Garante: Accetta e Rifiuta stesso rilievo, entrambi un click. */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {expanded ? (
                <Button
                  onClick={() =>
                    decide({ ...DENY_ALL, preferences: prefToggle })
                  }
                >
                  {t("save")}
                </Button>
              ) : (
                <>
                  <Button onClick={() => decide(ACCEPT_ALL)} className="min-w-28">
                    {t("accept")}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => decide(DENY_ALL)}
                    className="min-w-28"
                  >
                    {t("reject")}
                  </Button>
                </>
              )}
              <Button
                variant="ghost"
                onClick={() => setExpanded((v) => !v)}
                className={cn(expanded && "ml-auto")}
              >
                {t("customize")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ConsentContext.Provider>
  );
}
