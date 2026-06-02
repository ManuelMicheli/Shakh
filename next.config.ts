import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // chessground ships untranspiled ESM/CSS — kept transpiled for App Router.
  transpilePackages: ["chessground"],

  // MOTORE: la build attuale è Stockfish lite single-thread → nessun header speciale.
  // Per passare alla full multi-thread (SharedArrayBuffer/threads) servirà aggiungere
  // qui gli header COOP/COEP. NON abilitarli ora: romperebbero il caricamento di
  // risorse cross-origin. Riferimento in src/lib/engine/engine.ts.
  // async headers() {
  //   return [{
  //     source: "/(.*)",
  //     headers: [
  //       { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  //       { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
  //     ],
  //   }];
  // },
};

export default nextConfig;
