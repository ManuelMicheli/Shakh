/**
 * Proxy server dell'Opening Explorer di Lichess.
 *
 * Perché passare dal server invece di chiamare Lichess dal browser:
 * - **User-Agent descrittivo**: le API tips di Lichess lo richiedono; il browser
 *   non può impostarlo (header proibito). Senza UA l'explorer può rispondere 401.
 * - **Cache condivisa** (CDN `s-maxage` + memoria del server) tra TUTTI gli utenti:
 *   una posizione interrogata una volta non ripaga il rate limit per gli altri.
 * - **Stale-while-error**: durante un disservizio di Lichess (401/429/5xx) si serve
 *   l'ultimo dato buono invece di un errore grezzo.
 *
 * Endpoint upstream:
 *   GET https://explorer.lichess.ovh/masters?fen=…
 *   GET https://explorer.lichess.ovh/lichess?fen=…
 */

import { NextResponse, type NextRequest } from "next/server";
import { clientIp, limitExplorer } from "@/lib/security/ratelimit";
import type {
  ExplorerData,
  ExplorerDb,
  ExplorerResult,
} from "@/lib/theory/explorer";

const BASE = "https://explorer.lichess.ovh";
const UA = "Shakh/1.0 (+https://shakh.app; chess learning platform)";
const TTL_MS = 60 * 60 * 1000; // 1h di freschezza in memoria

/** Cache server (per istanza) e dedup delle richieste in volo, per `db|fen`. */
const cache = new Map<string, { data: ExplorerData; ts: number }>();
const inflight = new Map<string, Promise<ExplorerData | null>>();

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

function lichessUrl(db: ExplorerDb, fen: string): string {
  const params = new URLSearchParams({ fen, moves: "12", topGames: "0" });
  if (db === "lichess") {
    params.set("speeds", "blitz,rapid,classical");
    params.set("ratings", "1600,1800,2000,2200");
  }
  return `${BASE}/${db}?${params.toString()}`;
}

function toData(raw: RawResponse): ExplorerData {
  return {
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
}

/** Interroga Lichess. Ritorna i dati o `null` se upstream non è disponibile. */
async function fetchUpstream(db: ExplorerDb, fen: string): Promise<ExplorerData | null> {
  const res = await fetch(lichessUrl(db, fen), {
    headers: { Accept: "application/json", "User-Agent": UA },
  });
  if (!res.ok) return null; // 401/429/5xx → gestito a monte con stale/messaggio
  const raw = (await res.json()) as RawResponse;
  return toData(raw);
}

function json(body: ExplorerResult): NextResponse {
  return NextResponse.json(body, {
    headers: {
      "Cache-Control": body.ok
        ? "public, s-maxage=3600, stale-while-revalidate=86400"
        : "no-store",
    },
  });
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const db = (req.nextUrl.searchParams.get("db") ?? "masters") as ExplorerDb;
  const fen = req.nextUrl.searchParams.get("fen") ?? "";

  if (db !== "masters" && db !== "lichess") {
    return NextResponse.json(
      { ok: false, error: "Invalid database." } satisfies ExplorerResult,
      { status: 400 },
    );
  }
  if (!fen || fen.length > 120) {
    return NextResponse.json(
      { ok: false, error: "Invalid position." } satisfies ExplorerResult,
      { status: 400 },
    );
  }

  const key = `${db}|${fen}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < TTL_MS) {
    return json({ ok: true, data: hit.data });
  }

  // Endpoint pubblico: il rate limit scatta solo sui cache-miss, cioè quando la
  // richiesta genererebbe traffico verso Lichess. I colpi in cache restano liberi.
  let pending = inflight.get(key);
  if (!pending) {
    const rate = await limitExplorer(clientIp(req));
    if (!rate.ok) {
      // Se c'è un dato stantio servilo comunque: meglio di un errore secco.
      if (hit) return json({ ok: true, data: hit.data });
      return NextResponse.json(
        {
          ok: false,
          error: "Too many requests. Try again shortly.",
          rateLimited: true,
        } satisfies ExplorerResult,
        {
          status: 429,
          headers: rate.retryAfter
            ? { "Retry-After": String(rate.retryAfter) }
            : undefined,
        },
      );
    }
    pending = (async () => {
      try {
        const data = await fetchUpstream(db, fen);
        if (data) cache.set(key, { data, ts: Date.now() });
        return data;
      } catch {
        return null;
      } finally {
        inflight.delete(key);
      }
    })();
    inflight.set(key, pending);
  }

  const data = await pending;
  if (data) return json({ ok: true, data });

  // Upstream KO: servi l'ultimo dato buono se esiste, altrimenti messaggio chiaro.
  if (hit) return json({ ok: true, data: hit.data });
  return json({
    ok: false,
    error:
      "Opening database temporarily unavailable (Lichess service). Try again shortly.",
    rateLimited: true,
  });
}
