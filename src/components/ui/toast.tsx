"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

type ToastVariant = "default" | "success" | "error";

interface Toast {
  id: number;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastCtx {
  toast: (t: Omit<Toast, "id" | "variant"> & { variant?: ToastVariant }) => void;
}

const Ctx = createContext<ToastCtx | null>(null);

export function useToast() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useToast deve stare dentro <ToastProvider>");
  return c;
}

let nextId = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const t = useTranslations("common");
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback<ToastCtx["toast"]>(
    ({ title, description, variant = "default" }) => {
      const id = nextId++;
      setToasts((prev) => [...prev, { id, title, description, variant }]);
      setTimeout(() => remove(id), 4500);
    },
    [remove],
  );

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div
        className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-full max-w-[16rem] flex-col gap-2 sm:max-w-sm"
        role="region"
        aria-label={t("notifications")}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            aria-live="polite"
            className={cn(
              "pointer-events-auto rounded-md border bg-surface p-2.5 shadow-lg sm:p-4",
              t.variant === "success" && "border-eval-best",
              t.variant === "error" && "border-eval-blunder",
              t.variant === "default" && "border-border",
            )}
          >
            <p className="text-xs font-medium text-text sm:text-sm">{t.title}</p>
            {t.description && (
              <p className="mt-1 text-xs text-text-muted sm:text-sm">{t.description}</p>
            )}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
