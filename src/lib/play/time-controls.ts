/**
 * Controlli di tempo (orologio) per le partite. `initialMs = null` significa
 * partita senza orologio (illimitata). L'incremento è alla Fischer: aggiunto
 * al giocatore DOPO ogni sua mossa.
 */
import type { Locale } from "@/i18n/config";

export interface TimeControl {
  id: string;
  label: string;
  group: string;
  /** Tempo base per giocatore in ms. null = illimitato (nessun orologio). */
  initialMs: number | null;
  /** Incremento per mossa in ms. */
  incMs: number;
}

export const TIME_CONTROLS: TimeControl[] = [
  { id: "unlimited", label: "Unlimited", group: "No clock", initialMs: null, incMs: 0 },
  { id: "1+0", label: "1+0", group: "Bullet", initialMs: 60_000, incMs: 0 },
  { id: "2+1", label: "2+1", group: "Bullet", initialMs: 120_000, incMs: 1_000 },
  { id: "3+0", label: "3+0", group: "Blitz", initialMs: 180_000, incMs: 0 },
  { id: "3+2", label: "3+2", group: "Blitz", initialMs: 180_000, incMs: 2_000 },
  { id: "5+0", label: "5+0", group: "Blitz", initialMs: 300_000, incMs: 0 },
  { id: "5+3", label: "5+3", group: "Blitz", initialMs: 300_000, incMs: 3_000 },
  { id: "10+0", label: "10+0", group: "Rapid", initialMs: 600_000, incMs: 0 },
  { id: "10+5", label: "10+5", group: "Rapid", initialMs: 600_000, incMs: 5_000 },
  { id: "15+10", label: "15+10", group: "Rapid", initialMs: 900_000, incMs: 10_000 },
  { id: "30+0", label: "30+0", group: "Classical", initialMs: 1_800_000, incMs: 0 },
];

export function findTimeControl(id: string): TimeControl {
  return TIME_CONTROLS.find((t) => t.id === id) ?? TIME_CONTROLS[0];
}

// ──────────────────────────── Etichette bilingue ─────────────────────────────
// Gli `id`/`label` sono notazione (lingua-neutra). Solo i nomi-gruppo e la voce
// "Unlimited"/"No clock" sono traducibili: qui gli accessor locale-aware.

const GROUP_I18N: Record<string, { it: string; en: string }> = {
  "No clock": { it: "Senza orologio", en: "No clock" },
  Bullet: { it: "Bullet", en: "Bullet" },
  Blitz: { it: "Blitz", en: "Blitz" },
  Rapid: { it: "Rapid", en: "Rapid" },
  Classical: { it: "Classica", en: "Classical" },
};

/** Nome localizzato di un gruppo di controlli di tempo (fallback al grezzo). */
export function timeControlGroupLabel(group: string, locale: Locale): string {
  const v = GROUP_I18N[group];
  return v ? (locale === "it" ? v.it : v.en) : group;
}

/** Etichetta localizzata di un controllo (solo "Unlimited" è tradotto). */
export function timeControlLabel(tc: TimeControl, locale: Locale): string {
  if (tc.id === "unlimited") return locale === "it" ? "Illimitato" : "Unlimited";
  return tc.label;
}

/** Formatta i ms residui in m:ss (o h:mm:ss oltre l'ora). */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}
