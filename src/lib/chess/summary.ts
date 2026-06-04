/**
 * Statistiche sintetiche di una partita ricavate dalla SOLA FEN della
 * posizione finale: numero di mosse, pezzi catturati, vantaggio materiale.
 * Usate dalla schermata di fine partita (GameOverOverlay), così da funzionare
 * in modo uniforme in sparring, hotseat e partita online (tutte espongono la FEN).
 */

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
 * Statistiche pronte per la griglia di GameOverOverlay. Il vantaggio materiale
 * è prefissato dal re del colore in vantaggio (♔ Bianco, ♚ Nero).
 */
export function gameStatsFromFen(fen: string): { label: string; value: string }[] {
  const s = summaryFromFen(fen);
  const material =
    s.balance === 0 ? "Pari" : s.balance > 0 ? `♔ +${s.balance}` : `♚ +${-s.balance}`;
  return [
    { label: "Mosse", value: String(s.moves) },
    { label: "Catture", value: String(s.captures) },
    { label: "Materiale", value: material },
  ];
}
