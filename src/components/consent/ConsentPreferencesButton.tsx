"use client";

import { OPEN_CONSENT_EVENT } from "@/lib/consent/store";

/** Riapre il pannello preferenze cookie (linkato dal footer, requisito Garante). */
export function ConsentPreferencesButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_CONSENT_EVENT))}
      className="text-text-muted underline-offset-2 transition-colors hover:text-text hover:underline"
    >
      {label}
    </button>
  );
}
