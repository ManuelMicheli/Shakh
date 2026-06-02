/**
 * Import del dataset puzzle di Lichess (CC0) nella tabella `puzzles`.
 *
 * Il CSV completo è enorme: questo script importa un SUBSET configurabile
 * (filtri per rating e popolarità + limite) e fa upsert idempotente su
 * `external_id`, così rilanciarlo non duplica nulla.
 *
 * Esecuzione (richiede SUPABASE_SERVICE_ROLE_KEY e NEXT_PUBLIC_SUPABASE_URL
 * in .env.local; il file viene letto automaticamente):
 *
 *   npx tsx scripts/import-puzzles.ts --file lichess_db_puzzle.csv \
 *     --limit 5000 --min-rating 800 --max-rating 2200 --min-popularity 80
 *
 * Scarica il dataset da: https://database.lichess.org/#puzzles
 *
 * Colonne CSV Lichess:
 *   PuzzleId,FEN,Moves,Rating,RatingDeviation,Popularity,NbPlays,Themes,GameUrl,OpeningTags
 */
import { createInterface } from "node:readline";
import { createReadStream } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createZstdDecompress } from "node:zlib";
import type { Readable } from "node:stream";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

interface Options {
  file: string;
  limit: number;
  minRating: number;
  maxRating: number;
  minPopularity: number;
  batchSize: number;
}

interface PuzzleInsert {
  external_id: string;
  fen: string;
  moves: string;
  rating: number;
  themes: string[];
  popularity: number;
}

function parseArgs(argv: string[]): Options {
  const get = (name: string): string | undefined => {
    const i = argv.indexOf(`--${name}`);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const num = (name: string, fallback: number): number => {
    const v = get(name);
    return v !== undefined ? Number(v) : fallback;
  };
  return {
    file: get("file") ?? "lichess_db_puzzle.csv",
    limit: num("limit", 5000),
    minRating: num("min-rating", 600),
    maxRating: num("max-rating", 2400),
    minPopularity: num("min-popularity", 70),
    batchSize: num("batch", 500),
  };
}

/** Carica le variabili da .env.local (lo script non gira nel runtime di Next). */
async function loadEnv(): Promise<void> {
  try {
    const raw = await readFile(join(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // .env.local assente: si suppone che le env siano già nell'ambiente.
  }
}

async function flush(supabase: SupabaseClient, rows: PuzzleInsert[]): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await supabase
    .from("puzzles")
    .upsert(rows, { onConflict: "external_id" });
  if (error) throw new Error(`Upsert fallito: ${error.message}`);
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  await loadEnv();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error(
      "[import-puzzles] Mancano NEXT_PUBLIC_SUPABASE_URL e/o SUPABASE_SERVICE_ROLE_KEY.",
    );
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log(
    `[import-puzzles] file=${opts.file} limit=${opts.limit} ` +
      `rating=[${opts.minRating},${opts.maxRating}] minPop=${opts.minPopularity}`,
  );

  // Il dataset Lichess è distribuito compresso in zstandard: se il file finisce
  // in .zst lo decomprimo al volo (Node 22.15+/24 ha zstd in zlib), così non
  // serve scrivere su disco il CSV intero (~diversi GB).
  // I dump Lichess .zst hanno un frame "skippable" di 12 byte in testa
  // (magic 0x184D2A50); il frame zstd vero inizia all'offset 12. Saltandolo
  // si evita l'errore "ZSTD_error_prefix_unknown" del decoder di Node.
  const isZst = opts.file.endsWith(".zst");
  const fileStream = createReadStream(opts.file, isZst ? { start: 12 } : {});
  const input: Readable = isZst
    ? fileStream.pipe(createZstdDecompress())
    : fileStream;

  const rl = createInterface({ input, crlfDelay: Infinity });

  let header = true;
  let scanned = 0;
  let kept = 0;
  let batch: PuzzleInsert[] = [];

  try {
    for await (const line of rl) {
      if (header) {
        header = false; // salta l'intestazione
        continue;
      }
      if (!line) continue;
      if (kept >= opts.limit) break;
      scanned++;

      // I campi rilevanti non contengono virgole, split semplice è sufficiente.
      const cols = line.split(",");
      if (cols.length < 8) continue;

      const [externalId, fen, moves, ratingStr, , popularityStr, , themesStr] = cols;
      const rating = Number(ratingStr);
      const popularity = Number(popularityStr);
      if (!Number.isFinite(rating) || !Number.isFinite(popularity)) continue;
      if (rating < opts.minRating || rating > opts.maxRating) continue;
      if (popularity < opts.minPopularity) continue;
      if (!fen || !moves) continue;

      batch.push({
        external_id: externalId,
        fen,
        moves,
        rating,
        themes: themesStr ? themesStr.trim().split(/\s+/).filter(Boolean) : [],
        popularity,
      });
      kept++;

      if (batch.length >= opts.batchSize) {
        await flush(supabase, batch);
        console.log(`[import-puzzles] importati ${kept} (scansionati ${scanned})…`);
        batch = [];
      }
    }
    await flush(supabase, batch);
  } finally {
    rl.close();
  }

  console.log(`[import-puzzles] Fatto. Importati/aggiornati ${kept} puzzle.`);
}

main().catch((err) => {
  console.error("[import-puzzles] errore:", err);
  process.exit(1);
});
