import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Rate limiting per le route AI (prompt 10, §6).
 *
 * Le chiamate ad Anthropic sono la voce di costo e il bersaglio di abusi:
 * limitiamo per-utente E per-IP. Store: Upstash Redis (serverless, affidabile
 * su Vercel multi-istanza). Se le env non sono configurate, il limiter è un
 * NO-OP — così build e sviluppo locale girano senza dipendenze esterne.
 */

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

let userLimiter: Ratelimit | null = null;
let ipLimiter: Ratelimit | null = null;

if (url && token) {
  const redis = new Redis({ url, token });
  // Per-utente: 20 spiegazioni/Q&A al minuto — generoso per l'uso reale, basta
  // a fermare lo scripting.
  userLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, "60 s"),
    prefix: "rl:coach:user",
    analytics: false,
  });
  // Per-IP: tetto più alto (più utenti dietro NAT) ma comunque protettivo.
  ipLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(40, "60 s"),
    prefix: "rl:coach:ip",
    analytics: false,
  });
}

export interface RateResult {
  ok: boolean;
  /** Secondi di attesa suggeriti quando ok=false. */
  retryAfter?: number;
}

const OK: RateResult = { ok: true };

/** IP del client dietro il proxy Vercel. */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

async function consume(limiter: Ratelimit | null, key: string): Promise<RateResult> {
  if (!limiter) return OK; // no-op senza store configurato
  const res = await limiter.limit(key);
  if (res.success) return OK;
  return { ok: false, retryAfter: Math.max(1, Math.ceil((res.reset - Date.now()) / 1000)) };
}

/** Verifica i limiti per IP e per utente; il primo che scatta vince. */
export async function limitCoach(userId: string, ip: string): Promise<RateResult> {
  const byIp = await consume(ipLimiter, ip);
  if (!byIp.ok) return byIp;
  return consume(userLimiter, userId);
}

/** Risposta 429 standard con header Retry-After. */
export function tooMany(retryAfter?: number): Response {
  return new Response("Too many coach requests. Please try again shortly.", {
    status: 429,
    headers: retryAfter ? { "Retry-After": String(retryAfter) } : undefined,
  });
}
