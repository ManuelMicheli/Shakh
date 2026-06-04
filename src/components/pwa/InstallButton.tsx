"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

/** Evento non-standard (Chromium): tipizzato a mano, non è in lib.dom. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

/**
 * Bottone "Download": avvia l'installazione PWA.
 * - Chromium (desktop/Android): usa l'evento `beforeinstallprompt` → prompt nativo.
 * - iOS Safari: nessuna API, mostra le istruzioni «Aggiungi a Home».
 * - Altrove / prompt non ancora pronto: suggerisce il menu del browser.
 * Si nasconde se l'app è già installata (display standalone).
 */
export function InstallButton({ className }: { className?: string }) {
  const t = useTranslations("landing");
  const { toast } = useToast();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (isStandalone()) {
      setInstalled(true);
      return;
    }
    const onPrompt = (e: Event) => {
      e.preventDefault(); // impedisce il mini-infobar, lo lanciamo noi al click
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
      toast({
        title: t("installDoneTitle"),
        description: t("installDoneBody"),
        variant: "success",
      });
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [t, toast]);

  if (installed) return null;

  const handleClick = async () => {
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice;
      setDeferred(null); // l'evento è monouso
      return;
    }
    // Nessun prompt nativo disponibile: istruzioni manuali.
    toast(
      isIOS()
        ? { title: t("installIosTitle"), description: t("installIosBody") }
        : { title: t("installHintTitle"), description: t("installHintBody") },
    );
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-md border border-border font-medium transition-colors hover:bg-surface-2",
        className,
      )}
    >
      <Download className="h-4 w-4 shrink-0" aria-hidden />
      {t("downloadCta")}
    </button>
  );
}
