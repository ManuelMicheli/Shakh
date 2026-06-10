import path from "node:path";
import { defineConfig } from "vitest/config";

// Test solo sui moduli puri (niente DOM/Next): logica scacchistica e di dominio.
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(process.cwd(), "src") },
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
