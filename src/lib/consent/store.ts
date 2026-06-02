/**
 * Stato del consenso cookie (prompt 10, §1).
 *
 * Conformità Garante: i cookie tecnici sono sempre attivi (non richiedono
 * consenso); le categorie non necessarie partono DISATTIVATE (nessuna
 * preselezione) e si attivano solo con scelta esplicita. La scelta è
 * persistita in un cookie leggibile lato server e ri-modificabile dal footer.
 */
export const CONSENT_COOKIE = "shakh_consent";
export const CONSENT_VERSION = 1;
const MAX_AGE_DAYS = 180;

export interface ConsentState {
  v: number;
  /** Sempre true: cookie tecnici/funzionali essenziali. */
  necessary: true;
  /** Cookie di preferenza non essenziali. Default: false. */
  preferences: boolean;
  /** Timestamp ISO della decisione. */
  ts: string;
}

export const DENY_ALL: Omit<ConsentState, "ts"> = {
  v: CONSENT_VERSION,
  necessary: true,
  preferences: false,
};

export const ACCEPT_ALL: Omit<ConsentState, "ts"> = {
  v: CONSENT_VERSION,
  necessary: true,
  preferences: true,
};

/** Legge il consenso dal cookie del browser; null se non deciso/obsoleto. */
export function readConsent(): ConsentState | null {
  if (typeof document === "undefined") return null;
  const raw = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${CONSENT_COOKIE}=`))
    ?.split("=")[1];
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as ConsentState;
    if (parsed.v !== CONSENT_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Persiste la scelta nel cookie (SameSite=Lax, niente HttpOnly: serve al client). */
export function writeConsent(choice: Omit<ConsentState, "ts">): ConsentState {
  const state: ConsentState = { ...choice, ts: new Date().toISOString() };
  const value = encodeURIComponent(JSON.stringify(state));
  const maxAge = MAX_AGE_DAYS * 24 * 60 * 60;
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${CONSENT_COOKIE}=${value}; Max-Age=${maxAge}; Path=/; SameSite=Lax${secure}`;
  return state;
}

/** Evento per riaprire il pannello preferenze dal footer. */
export const OPEN_CONSENT_EVENT = "shakh:open-consent";
