import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { buildCsp, makeNonce } from "@/lib/security/csp";

export async function middleware(request: NextRequest) {
  // Nonce per richiesta + CSP. Il nonce va sugli header di RICHIESTA (Next lo
  // applica ai propri script e lo espone via x-nonce al layout); l'header CSP
  // va anche sulla RISPOSTA per il browser.
  const nonce = makeNonce();
  const csp = buildCsp(nonce, process.env.NODE_ENV !== "production");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", csp);

  const response = await updateSession(request, requestHeaders);
  response.headers.set("content-security-policy", csp);
  return response;
}

export const config = {
  matcher: [
    /*
     * Match di tutte le route tranne:
     * - _next/static, _next/image
     * - favicon e asset statici comuni
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?|exe|msi|dmg)$).*)",
  ],
};
