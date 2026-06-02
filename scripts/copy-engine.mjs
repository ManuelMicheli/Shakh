// Copia i file del motore Stockfish (WASM lite single-thread) dal pacchetto npm
// a public/engine/, così il web worker li carica localmente da /engine/ (niente CDN).
// Eseguito in postinstall e prima del build. Idempotente.
import { mkdir, copyFile, access } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "node_modules", "stockfish", "src");
const dest = join(root, "public", "engine");

// Build attuale: Stockfish 16 single-thread. La NNUE (~40MB) è esterna al wasm,
// quindi va copiata anch'essa: il motore la richiede a runtime via locateFile.
const FILES = [
  "stockfish-nnue-16-single.js",
  "stockfish-nnue-16-single.wasm",
  "nn-5af11540bbfe.nnue",
];

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  if (!(await exists(src))) {
    console.warn("[copy-engine] pacchetto 'stockfish' non trovato, salto.");
    return;
  }
  await mkdir(dest, { recursive: true });
  for (const file of FILES) {
    const from = join(src, file);
    if (!(await exists(from))) {
      console.warn(`[copy-engine] manca ${file}, salto.`);
      continue;
    }
    await copyFile(from, join(dest, file));
    console.log(`[copy-engine] ${file} → public/engine/`);
  }
}

main().catch((err) => {
  console.error("[copy-engine] errore:", err);
  process.exit(1);
});
