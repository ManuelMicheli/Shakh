import "server-only";

import Anthropic from "@anthropic-ai/sdk";

/**
 * Client Anthropic — SOLO lato server. La chiave (`ANTHROPIC_API_KEY`) non
 * deve mai raggiungere il browser. Importare "server-only" fa fallire la build
 * se questo modulo finisce in un bundle client.
 */

let cached: Anthropic | null = null;

/** Errore esposto quando la chiave non è configurata: la UI mostra un fallback pulito. */
export class CoachUnavailableError extends Error {
  constructor(message = "Il coach AI non è configurato.") {
    super(message);
    this.name = "CoachUnavailableError";
  }
}

export function getAnthropic(): Anthropic {
  if (cached) return cached;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new CoachUnavailableError();
  cached = new Anthropic({ apiKey });
  return cached;
}

export function isCoachConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}
