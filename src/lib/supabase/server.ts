import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";

/**
 * Client Supabase lato server (Server Components, Server Actions, Route Handlers).
 * Legge/scrive i cookie di sessione tramite next/headers.
 *
 * Memoizzato per richiesta con `cache()`: layout + pagina condividono la stessa
 * istanza in un singolo render RSC, niente client (e cookie read) ripetuti.
 */
export const createClient = cache(async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Chiamato da un Server Component: ignorabile se il refresh
            // sessione è gestito dal middleware.
          }
        },
      },
    },
  );
});

/**
 * Utente autenticato, memoizzato per richiesta.
 *
 * `auth.getUser()` fa una chiamata di rete al server Auth di Supabase per
 * validare il token: senza memoizzazione viene ripetuta da layout E pagina (e
 * da ogni componente che la chiama) nello stesso render. Con `cache()` la rete
 * viene colpita una sola volta per richiesta. Il middleware ha già validato la
 * sessione a monte, quindi qui contiamo su un solo round-trip per navigazione.
 */
export const getUser = cache(async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
