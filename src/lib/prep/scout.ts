/**
 * "Prep vs avversario" (Fase 6): aggrega le partite pubbliche di un avversario
 * in un report di scouting — cosa gioca per colore, con che frequenza e con che
 * rendimento, e dove rende peggio (i "buchi" da puntare).
 *
 * Modulo PURO: riceve voci già normalizzate (colore, apertura, esito) e produce
 * il report. Il fetch/parsing delle partite avviene nella Server Action.
 */

export type Color = "white" | "black";

/** Una partita dell'avversario, ridotta ai dati utili allo scouting. */
export interface ScoutEntry {
  color: Color;
  /** Nome apertura (preferito) o codice ECO o "Sconosciuta". */
  key: string;
  eco: string | null;
  /** Punteggio dal punto di vista dell'AVVERSARIO: 1 vittoria, 0.5 patta, 0 sconfitta. */
  score: number;
}

export interface OpeningStat {
  key: string;
  eco: string | null;
  games: number;
  /** Rendimento medio dell'avversario in % (0..100). */
  scorePct: number;
}

export interface WeakOpening extends OpeningStat {
  color: Color;
}

export interface ScoutReport {
  total: number;
  whiteGames: number;
  blackGames: number;
  asWhite: OpeningStat[];
  asBlack: OpeningStat[];
  /** Aperture in cui l'avversario rende peggio (da puntare). */
  weakest: WeakOpening[];
}

/** Soglia minima di partite perché un'apertura conti come "punto debole". */
const MIN_WEAK_GAMES = 3;

interface Acc {
  games: number;
  scoreSum: number;
  eco: string | null;
}

function aggregateColor(entries: ScoutEntry[]): OpeningStat[] {
  const map = new Map<string, Acc>();
  for (const e of entries) {
    const cur = map.get(e.key) ?? { games: 0, scoreSum: 0, eco: e.eco };
    cur.games += 1;
    cur.scoreSum += e.score;
    if (!cur.eco && e.eco) cur.eco = e.eco;
    map.set(e.key, cur);
  }
  return Array.from(map.entries())
    .map(([key, a]) => ({
      key,
      eco: a.eco,
      games: a.games,
      scorePct: Math.round((a.scoreSum / a.games) * 100),
    }))
    .sort((a, b) => b.games - a.games);
}

/** Costruisce il report di scouting dalle voci. */
export function buildScoutReport(entries: ScoutEntry[]): ScoutReport {
  const white = entries.filter((e) => e.color === "white");
  const black = entries.filter((e) => e.color === "black");
  const asWhite = aggregateColor(white);
  const asBlack = aggregateColor(black);

  const weakest: WeakOpening[] = [
    ...asWhite.map((o) => ({ ...o, color: "white" as Color })),
    ...asBlack.map((o) => ({ ...o, color: "black" as Color })),
  ]
    .filter((o) => o.games >= MIN_WEAK_GAMES)
    .sort((a, b) => a.scorePct - b.scorePct)
    .slice(0, 5);

  return {
    total: entries.length,
    whiteGames: white.length,
    blackGames: black.length,
    asWhite: asWhite.slice(0, 8),
    asBlack: asBlack.slice(0, 8),
    weakest,
  };
}
