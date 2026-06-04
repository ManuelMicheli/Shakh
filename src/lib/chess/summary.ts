/**
 * Statistiche sintetiche di una partita ricavate dalla SOLA FEN della
 * posizione finale: numero di mosse, pezzi catturati, vantaggio materiale.
 * Usate dalla schermata di fine partita (GameOverOverlay), così da funzionare
 * in modo uniforme in sparring, hotseat e partita online (tutte espongono la FEN).
 */

import type { Locale } from "@/i18n/config";

/** Valore convenzionale dei pezzi (re escluso). */
const VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };

export interface GameSummary {
  /** Contatore di mossa raggiunto (campo fullmove della FEN). */
  moves: number;
  /** Pezzi catturati in totale, entrambi i colori. */
  captures: number;
  /** Vantaggio materiale in punti: >0 Bianco, <0 Nero, 0 pari. */
  balance: number;
}

export function summaryFromFen(fen: string): GameSummary {
  const parts = fen.split(" ");
  const placement = parts[0] ?? "";
  const fullmove = parseInt(parts[5] ?? "1", 10) || 1;

  let pieces = 0; // pezzi non-re ancora sulla scacchiera
  let balance = 0;
  for (const ch of placement) {
    const lower = ch.toLowerCase();
    const v = VALUE[lower];
    if (v === undefined) continue; // cifre vuote, '/', re (k/K)
    pieces += 1;
    balance += ch === lower ? -v : v; // maiuscole = Bianco, minuscole = Nero
  }

  // A inizio partita ci sono 30 pezzi non-re (32 totali meno i 2 re).
  const captures = Math.max(0, 30 - pieces);
  return { moves: fullmove, captures, balance };
}

/** Durata in mm:ss (o h:mm:ss oltre l'ora) a partire dai millisecondi. */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/**
 * Statistiche secondarie per la griglia di GameOverOverlay. Le mosse sono ora
 * sostituite dal riepilogo qualità e il materiale è mostrato a bordo scacchiera
 * durante la partita: qui resta solo il totale catture.
 */
export function gameStatsFromFen(
  fen: string,
  locale: Locale = "en",
): { label: string; value: string }[] {
  const s = summaryFromFen(fen);
  return [{ label: locale === "it" ? "Catture" : "Captures", value: String(s.captures) }];
}

/** Tipi di pezzo (re escluso), ordinati per valore crescente. */
export type CapturedPiece = "p" | "n" | "b" | "r" | "q";
const PIECE_ORDER: CapturedPiece[] = ["p", "n", "b", "r", "q"];
const START_COUNT: Record<CapturedPiece, number> = { p: 8, n: 2, b: 2, r: 2, q: 1 };

export interface CapturedMaterial {
  /** Pezzi neri catturati dal Bianco, in ordine di valore. */
  byWhite: CapturedPiece[];
  /** Pezzi bianchi catturati dal Nero, in ordine di valore. */
  byBlack: CapturedPiece[];
  /** Vantaggio materiale in punti: >0 Bianco, <0 Nero. */
  balance: number;
}

/**
 * Ricava i pezzi catturati da ciascun colore confrontando la dotazione iniziale
 * con quella presente nella FEN. I pezzi mancanti di un colore sono quelli
 * catturati dall'avversario.
 */
export function capturedFromFen(fen: string): CapturedMaterial {
  const placement = fen.split(" ")[0] ?? "";
  const live: Record<string, number> = {};
  for (const ch of placement) {
    if (/[a-z]/i.test(ch)) live[ch] = (live[ch] ?? 0) + 1;
  }

  const byWhite: CapturedPiece[] = []; // = pezzi NERI mancanti
  const byBlack: CapturedPiece[] = []; // = pezzi BIANCHI mancanti
  let balance = 0;
  for (const p of PIECE_ORDER) {
    const blackMissing = START_COUNT[p] - (live[p] ?? 0); // p minuscolo = nero
    const whiteMissing = START_COUNT[p] - (live[p.toUpperCase()] ?? 0);
    for (let i = 0; i < blackMissing; i++) byWhite.push(p);
    for (let i = 0; i < whiteMissing; i++) byBlack.push(p);
    balance += (blackMissing - whiteMissing) * VALUE[p];
  }
  return { byWhite, byBlack, balance };
}
