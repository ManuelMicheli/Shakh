/**
 * Valida le partite indimenticabili: ogni PGN deve caricarsi in chess.js
 * (tutte le mosse legali), il risultato deve essere coerente e ogni indice
 * di annotazione deve cadere dentro la partita.
 *
 * Uso: npx tsx scripts/validate-famous.ts
 */
import { Chess } from "chess.js";
import { FAMOUS_GAMES } from "../src/lib/games/famous";

let failures = 0;

for (const game of FAMOUS_GAMES) {
  const chess = new Chess();
  try {
    chess.loadPgn(game.pgn);
  } catch (e) {
    console.error(`✗ ${game.slug}: PGN invalido — ${(e as Error).message}`);
    failures++;
    continue;
  }

  const plies = chess.history().length;
  const isMate = chess.isCheckmate();
  const lastSan = chess.history()[plies - 1];
  const declaredMate = game.pgn.includes("#");

  if (declaredMate !== isMate) {
    console.error(
      `✗ ${game.slug}: il PGN dichiara matto=${declaredMate} ma chess.js dice ${isMate}`,
    );
    failures++;
  }

  const badIdx = Object.keys(game.annotations)
    .map(Number)
    .filter((i) => !Number.isInteger(i) || i < 0 || i >= plies);
  if (badIdx.length > 0) {
    console.error(
      `✗ ${game.slug}: indici annotazione fuori range (0..${plies - 1}): ${badIdx.join(", ")}`,
    );
    failures++;
  }

  console.log(
    `✓ ${game.slug}: ${plies} semimosse legali, ultima ${lastSan}, ${game.result}${isMate ? " (scacco matto)" : ""}, ${Object.keys(game.annotations).length} annotazioni`,
  );
}

if (failures > 0) {
  console.error(`\n${failures} problemi trovati.`);
  process.exit(1);
}
console.log(`\nTutte le ${FAMOUS_GAMES.length} partite sono valide.`);
