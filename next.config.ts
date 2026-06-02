import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/**
 * Header di sicurezza STATICI (prompt 10, §2). La CSP è dinamica (nonce per
 * richiesta) e vive nel middleware — qui solo gli header che non cambiano.
 * NESSUN COOP/COEP: resta la build Stockfish lite single-thread (prompt 02).
 */
const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // chessground ships untranspiled ESM/CSS — kept transpiled for App Router.
  transpilePackages: ["chessground"],

  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // WASM del motore: MIME corretto (§7). public/engine servito da Next con
      // application/wasm; ribadito qui per ambienti che non lo impostano.
      {
        source: "/engine/:path*.wasm",
        headers: [{ key: "Content-Type", value: "application/wasm" }],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
