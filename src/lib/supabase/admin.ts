import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Client amministrativo (service role) — SOLO server-side.
 *
 * Unico uso legittimo: operazioni che richiedono privilegi non concedibili via
 * RLS, come la cancellazione dell'utente in auth.users (diritto all'oblio).
 * NON usarlo per aggirare RLS sui dati: per quello c'è il client utente.
 * La chiave service role non deve MAI raggiungere il client.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Service role non configurato.");
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
