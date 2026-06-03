/**
 * Opening Explorer di Lichess — ANCORA la teoria ai dati reali: mostra cosa si
 * gioca davvero in una posizione, non solo cosa dice la lezione.
 *
 * Le richieste NON vanno più dirette a Lichess dal browser: passano dal proxy
 * server `/api/explorer` (User-Agent descrittivo + cache condivisa + stale su
 * disservizio). Lichess restituiva 401 ai client anonimi diretti. Qui resta la
 * cache lato client per FEN e la dedup delle richieste in volo verso il proxy.
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

/** Cache per chiave `db|fen` e dedup delle richieste in volo (verso il proxy). */
const cache = new Map<string, ExplorerData>();
const inflight = new Map<string, Promise<ExplorerResult>>();

function proxyUrl(db: ExplorerDb, fen: string): string {
  const params = new URLSearchParams({ db, fen });
  return `/api/explorer?${params.toString()}`;
}

/** Interroga l'explorer (via proxy) per la posizione data. Cachato per FEN. */
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
      res = await fetch(proxyUrl(db, fen), { headers: { Accept: "application/json" } });
    } catch {
      return { ok: false, error: "Errore di rete. Riprova tra poco." };
    }
    let body: ExplorerResult;
    try {
      body = (await res.json()) as ExplorerResult;
    } catch {
      return { ok: false, error: "Database aperture non disponibile al momento." };
    }
    if (body.ok) cache.set(key, body.data);
    return body;
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
