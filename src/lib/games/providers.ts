/**
 * Astrazione `GameProvider`: una sorgente esterna di partite di un utente.
 * Implementati Lichess (export PGN diretto) e Chess.com (API "archives": un
 * archivio JSON per mese, dal più vecchio al più recente).
 */

import type { GameSource } from "./types";

export type ProviderErrorCode =
  | "not_found"
  | "rate_limit"
  | "network"
  | "unsupported";

export class ProviderError extends Error {
  constructor(
    public code: ProviderErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

export interface GameProvider {
  id: GameSource;
  label: string;
  /** Scarica fino a `max` partite recenti dell'utente, come testo PGN multi-partita. */
  fetchUserGamesPgn(username: string, max: number): Promise<string>;
}

export const lichessProvider: GameProvider = {
  id: "lichess",
  label: "Lichess",
  async fetchUserGamesPgn(username, max) {
    const url =
      `https://lichess.org/api/games/user/${encodeURIComponent(username)}` +
      `?max=${max}&opening=true&clocks=false&evals=false`;

    let res: Response;
    try {
      // Timeout esplicito: senza, una risposta lenta/appesa terrebbe aperta la
      // Server Action a tempo indefinito.
      res = await fetch(url, {
        headers: { Accept: "application/x-chess-pgn" },
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      throw new ProviderError("network", "Errore di rete o timeout contattando Lichess.");
    }

    if (res.status === 404) {
      throw new ProviderError(
        "not_found",
        `Utente Lichess "${username}" non trovato.`,
      );
    }
    if (res.status === 429) {
      throw new ProviderError(
        "rate_limit",
        "Troppe richieste a Lichess. Attendi qualche secondo e riprova.",
      );
    }
    if (!res.ok) {
      throw new ProviderError("network", `Lichess ha risposto con stato ${res.status}.`);
    }
    return res.text();
  },
};

/**
 * Chess.com non ha un endpoint di export PGN diretto: espone gli "archives",
 * un URL JSON per ogni mese giocato (ordine cronologico, più recente in fondo).
 * Scarichiamo dal mese più recente all'indietro finché non raccogliamo `max`
 * partite, prendendo le più recenti (in coda a ogni mese), e concateniamo i PGN.
 */
interface ChesscomArchivesResponse {
  archives?: string[];
}
interface ChesscomGame {
  pgn?: string;
}
interface ChesscomMonthResponse {
  games?: ChesscomGame[];
}

// L'API pubblica di Chess.com richiede uno User-Agent esplicito: senza, può
// rispondere 403. Niente autenticazione: sono dati pubblici.
const CHESSCOM_UA = "Shakh/1.0 (https://shakh.app)";

async function chesscomFetch(url: string): Promise<Response> {
  try {
    return await fetch(url, {
      headers: { "User-Agent": CHESSCOM_UA, Accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new ProviderError("network", "Errore di rete o timeout contattando Chess.com.");
  }
}

export const chesscomProvider: GameProvider = {
  id: "chesscom",
  label: "Chess.com",
  async fetchUserGamesPgn(username, max) {
    // Chess.com normalizza gli username in minuscolo nel path.
    const user = encodeURIComponent(username.toLowerCase());
    const listRes = await chesscomFetch(
      `https://api.chess.com/pub/player/${user}/games/archives`,
    );
    if (listRes.status === 404) {
      throw new ProviderError("not_found", `Utente Chess.com "${username}" non trovato.`);
    }
    if (listRes.status === 429) {
      throw new ProviderError(
        "rate_limit",
        "Troppe richieste a Chess.com. Attendi qualche secondo e riprova.",
      );
    }
    if (!listRes.ok) {
      throw new ProviderError("network", `Chess.com ha risposto con stato ${listRes.status}.`);
    }

    const { archives } = (await listRes.json()) as ChesscomArchivesResponse;
    if (!archives || archives.length === 0) return "";

    // Dal mese più recente all'indietro, raccogli le partite più recenti.
    const collected: string[] = [];
    for (let i = archives.length - 1; i >= 0 && collected.length < max; i--) {
      const monthRes = await chesscomFetch(archives[i]);
      if (monthRes.status === 429) {
        throw new ProviderError(
          "rate_limit",
          "Troppe richieste a Chess.com. Attendi qualche secondo e riprova.",
        );
      }
      if (!monthRes.ok) continue; // salta un mese non leggibile, prova il precedente
      const { games } = (await monthRes.json()) as ChesscomMonthResponse;
      if (!games) continue;
      // Entro il mese le partite sono dalla più vecchia alla più recente:
      // scorri al contrario per prendere prima le più recenti.
      for (let j = games.length - 1; j >= 0 && collected.length < max; j--) {
        const pgn = games[j].pgn;
        if (pgn && pgn.trim()) collected.push(pgn.trim());
      }
    }

    return collected.join("\n\n");
  },
};

export const PROVIDERS: Record<GameSource, GameProvider | null> = {
  pgn: null,
  lichess: lichessProvider,
  chesscom: chesscomProvider,
};
