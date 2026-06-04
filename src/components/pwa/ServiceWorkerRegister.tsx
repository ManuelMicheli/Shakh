"use client";

import { useEffect } from "react";

/**
 * Registra il service worker (/sw.js) per installabilità + fallback offline.
 * Solo in produzione: in dev il SW intralcerebbe l'HMR. Nessuno script inline
 * (resta sotto CSP nonce-strict): la registrazione gira nel bundle client.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    const register = () =>
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* registrazione best-effort: l'app resta usabile via web */
      });
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  return null;
}
