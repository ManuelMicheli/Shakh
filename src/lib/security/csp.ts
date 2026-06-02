/**
 * Content-Security-Policy con nonce (prompt 10, §2).
 *
 * Lo stile nonce è quello raccomandato da Next per l'App Router: il middleware
 * genera un nonce per richiesta, lo mette sugli header di richiesta (Next lo
 * applica ai propri script) e lo espone via `x-nonce` perché il layout possa
 * firmare i propri inline script (lo script anti-FOUC del tema).
 *
 * Sorgenti consentite — solo ciò che il prodotto usa davvero:
 * - Stockfish WASM nel web worker → `'wasm-unsafe-eval'` + `worker-src blob:`.
 * - API Lichess (explorer/tablebase/import) e Supabase (REST + realtime wss)
 *   in `connect-src`.
 * - L'API Anthropic è SOLO server-side: NON va nel connect-src del client.
 * - Niente COOP/COEP: resta la build Stockfish lite single-thread (§2, prompt 02).
 */

/** Host Supabase (https + wss per il realtime) ricavato dall'env pubblico. */
function supabaseOrigins(): string[] {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return [];
  try {
    const { host } = new URL(url);
    return [`https://${host}`, `wss://${host}`];
  } catch {
    return [];
  }
}

const LICHESS = [
  "https://explorer.lichess.ovh",
  "https://tablebase.lichess.ovh",
  "https://lichess.org",
];

/** Costruisce il valore dell'header CSP per il nonce dato. */
export function buildCsp(nonce: string, isDev: boolean): string {
  const connect = ["'self'", ...LICHESS, ...supabaseOrigins()];

  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    "'wasm-unsafe-eval'",
    // HMR / React Refresh in sviluppo richiedono eval.
    ...(isDev ? ["'unsafe-eval'"] : []),
  ];

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": scriptSrc,
    // Next/Tailwind iniettano <style> inline: gestiti con 'unsafe-inline'
    // (l'iniezione di stile è basso rischio, lo script no — quello è col nonce).
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:"],
    "font-src": ["'self'"],
    "worker-src": ["'self'", "blob:"],
    "connect-src": connect,
    "frame-ancestors": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "object-src": ["'none'"],
    "manifest-src": ["'self'"],
  };

  return Object.entries(directives)
    .map(([k, v]) => `${k} ${v.join(" ")}`)
    .join("; ");
}

/** Nonce casuale (base64) per la richiesta corrente. */
export function makeNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}
