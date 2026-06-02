/**
 * Verifica candidati FEN dei finali contro la tablebase Lichess (≤7 pezzi).
 * Usa-e-getta: stampa esito esatto + DTZ/DTM e la migliore mossa, così da
 * fissare posizioni con esito CERTO prima di scrivere il seed.
 *
 *   npx tsx scripts/verify-endgames.mts
 */
import { Chess } from "chess.js";

const URL = "https://tablebase.lichess.ovh/standard";

interface Cand {
  key: string;
  fen: string;
  expect: "win" | "draw" | "loss";
}

// `expect` è l'esito ATTESO per il lato al tratto (= l'utente nella pratica).
const CANDS: Cand[] = [
  { key: "kp_vs_k (Ke8/Ke6/Pe4, W)", fen: "4k3/8/4K3/8/4P3/8/8/8 w - - 0 1", expect: "win" },
  { key: "lucena (Kd8 Pd7 Re1 / Kf6 Ra2, W)", fen: "3K4/3P4/5k2/8/8/8/r7/4R3 w - - 0 1", expect: "win" },
  // Philidor: re attaccante sul 5ª (Kd5), pedone e5, re difensore davanti (Ke7),
  // torre difensiva sulla 6ª (a6) a sbarrare la 6ª. Lato al tratto = difensore.
  { key: "philidor A (Kd5 Pe5 Rh1 / Ke7 Ra6, b)", fen: "8/4k3/r7/3KP3/8/8/8/7R b - - 0 1", expect: "draw" },
  { key: "philidor B (Kf5 Pe5 Rh1 / Ke7 Ra6, b)", fen: "8/4k3/r7/4PK2/8/8/8/7R b - - 0 1", expect: "draw" },
  { key: "philidor C (Ke5 Pe4? Rh1 / Ke7 Ra6, b)", fen: "8/4k3/r7/4K3/4P3/8/8/7R b - - 0 1", expect: "draw" },
  { key: "matti KQ (Ke8/Ke6/Qd2, W)", fen: "4k3/8/4K3/8/8/8/3Q4/8 w - - 0 1", expect: "win" },
  { key: "matti KR (Ke8/Ke6/Re1, W)", fen: "4k3/8/4K3/8/8/8/8/4R3 w - - 0 1", expect: "win" },
  { key: "q_vs_p central (Kf6 Qa8 / Kd1 Pd2, W)", fen: "Q7/8/5K2/8/8/8/3p4/3k4 w - - 0 1", expect: "win" },
  { key: "q_vs_p central2 (Kf5 Qa8 / Kd1 Pd2, W)", fen: "Q7/8/8/5K2/8/8/3p4/3k4 w - - 0 1", expect: "win" },
];

async function tb(fen: string) {
  const res = await fetch(`${URL}?fen=${encodeURIComponent(fen)}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as {
    category: string;
    dtz: number | null;
    dtm: number | null;
    moves: { san: string; category: string; dtz: number | null; dtm: number | null }[];
  };
}

for (const c of CANDS) {
  let legal = true;
  try {
    new Chess(c.fen);
  } catch {
    legal = false;
  }
  if (!legal) {
    console.log(`✗ ${c.key}: FEN ILLEGALE (chess.js)`);
    continue;
  }
  try {
    const d = await tb(c.fen);
    const best = d.moves[0];
    const ok = d.category.includes(c.expect);
    console.log(
      `${ok ? "✓" : "✗"} ${c.key}\n   esito=${d.category} dtz=${d.dtz} dtm=${d.dtm} | best=${best?.san} (${best?.category}, dtz ${best?.dtz})`,
    );
  } catch (e) {
    console.log(`! ${c.key}: ${(e as Error).message}`);
  }
  await new Promise((r) => setTimeout(r, 300));
}
