/**
 * Opening Explorer di Lichess — ANCORA la teoria ai dati reali: mostra cosa si
 * gioca davvero in una posizione, non solo cosa dice la lezione.
 *
 * API pubblica (nessun'altra terza parte), con RATE LIMIT: per questo le risposte
 * vengono memorizzate per FEN e le richieste in volo deduplicate. Fallback pulito
 * su errore/limite (l'UI mostra un messaggio, non si rompe).
 *
 *   GET https://explorer.lichess.ovh/masters?fen=…   (database dei maestri)
 *   GET https://explorer.lichess.ovh/lichess?fen=…   (partite online)
 */

export type ExplorerDb = "masters" | "lichess";

export interface ExplorerMove {
  uci: string;
  san: string;
  /** Conteggi di esito per le partite che hanno giocato questa mossa. */
  white: number;
  draws: number;
  black: number;
  averageRating?: number;
}

export interface ExplorerData {
  /** Conteggi di esito totali nella posizione. */
  white: number;
  draws: number;
  black: number;
  moves: ExplorerMove[];
  opening?: { eco: string; name: string } | null;
}

export type ExplorerResult =
  | { ok: true; data: ExplorerData }
  | { ok: false; error: string; rateLimited?: boolean };

const BASE = "https://explorer.lichess.ovh";

/** Cache per chiave `db|fen` e dedup delle richieste in volo. */
const cache = new Map<string, ExplorerData>();
const inflight = new Map<string, Promise<ExplorerResult>>();

function buildUrl(db: ExplorerDb, fen: string): string {
  const params = new URLSearchParams({ fen, moves: "12", topGames: "0" });
  if (db === "lichess") {
    params.set("speeds", "blitz,rapid,classical");
    params.set("ratings", "1600,1800,2000,2200");
  }
  return `${BASE}/${db}?${params.toString()}`;
}

interface RawMove {
  uci: string;
  san: string;
  white: number;
  draws: number;
  black: number;
  averageRating?: number;
}
interface RawResponse {
  white: number;
  draws: number;
  black: number;
  moves: RawMove[];
  opening?: { eco: string; name: string } | null;
}

/** Interroga l'explorer per la posizione data. Risultato cachato per FEN. */
export async function fetchOpeningExplorer(
  fen: string,
  db: ExplorerDb = "masters",
): Promise<ExplorerResult> {
  const key = `${db}|${fen}`;
  const cached = cache.get(key);
  if (cached) return { ok: true, data: cached };

  const pending = inflight.get(key);
  if (pending) return pending;

  const promise: Promise<ExplorerResult> = (async () => {
    let res: Response;
    try {
      res = await fetch(buildUrl(db, fen), {
        headers: { Accept: "application/json" },
      });
    } catch {
      return { ok: false, error: "Errore di rete contattando Lichess." };
    }
    if (res.status === 429) {
      return { ok: false, error: "Troppe richieste all'explorer. Riprova tra poco.", rateLimited: true };
    }
    if (!res.ok) {
      return { ok: false, error: `L'explorer ha risposto con stato ${res.status}.` };
    }
    let raw: RawResponse;
    try {
      raw = (await res.json()) as RawResponse;
    } catch {
      return { ok: false, error: "Risposta dell'explorer non valida." };
    }
    const data: ExplorerData = {
      white: raw.white ?? 0,
      draws: raw.draws ?? 0,
      black: raw.black ?? 0,
      moves: (raw.moves ?? []).map((m) => ({
        uci: m.uci,
        san: m.san,
        white: m.white ?? 0,
        draws: m.draws ?? 0,
        black: m.black ?? 0,
        averageRating: m.averageRating,
      })),
      opening: raw.opening ?? null,
    };
    cache.set(key, data);
    return { ok: true, data };
  })();

  inflight.set(key, promise);
  try {
    return await promise;
  } finally {
    inflight.delete(key);
  }
}

/** Numero totale di partite registrate per una mossa. */
export function moveGames(m: ExplorerMove): number {
  return m.white + m.draws + m.black;
}

/**
 * Utility riutilizzabile (collegamento opzionale col prompt 03): la mossa `san`
 * è "da libro" nella posizione? Vero se compare nel database dei maestri.
 * NON rifà il 03; è solo un helper a disposizione.
 */
export async function isBookMove(fen: string, san: string): Promise<boolean> {
  const r = await fetchOpeningExplorer(fen, "masters");
  if (!r.ok) return false;
  return r.data.moves.some((m) => m.san === san && moveGames(m) > 0);
}
