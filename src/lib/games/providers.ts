/**
 * Astrazione `GameProvider`: una sorgente esterna di partite di un utente.
 * Oggi è implementato solo Lichess; l'interfaccia è pensata perché aggiungere
 * Chess.com (archives) in futuro sia banale (prompt successivi).
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
      res = await fetch(url, { headers: { Accept: "application/x-chess-pgn" } });
    } catch {
      throw new ProviderError("network", "Errore di rete contattando Lichess.");
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

/** Predisposto ma non implementato in questo prompt (vedi §1 del prompt 03). */
export const chesscomProvider: GameProvider = {
  id: "chesscom",
  label: "Chess.com",
  async fetchUserGamesPgn() {
    throw new ProviderError(
      "unsupported",
      "L'import da Chess.com non è ancora disponibile.",
    );
  },
};

export const PROVIDERS: Record<GameSource, GameProvider | null> = {
  pgn: null,
  lichess: lichessProvider,
  chesscom: chesscomProvider,
};
