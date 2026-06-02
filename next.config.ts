import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // chessground ships untranspiled ESM/CSS — kept transpiled for App Router.
  transpilePackages: ["chessground"],
};

export default nextConfig;
