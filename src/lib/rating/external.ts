/**
 * Lettura del rating di un account online (Lichess / Chess.com) per seminare il
 * dominio `external` del Rating Shakh.
 *
 * NON è "use server": espone funzioni async pure-ish (fetch di dati PUBBLICI,
 * nessuna autenticazione) richiamate dalle Server Action del profilo. Stesso
 * stile di `games/providers.ts`: timeout esplicito + errori tipizzati.
 *
 * La logica di selezione del "rating rappresentativo" (pesatura dei controlli
 * di tempo) è PURA e testabile a parte dal fetch.
 */

import { ProviderError } from "@/lib/games/providers";
import type { ExternalSource } from "./calibration";
import { externalToOtb } from "./calibration";

/** Peso di un controllo di tempo: i tempi lenti correlano meglio con la forza OTB. */
const CONTROL_WEIGHT: Record<string, number> = {
  classical: 1.0,
  correspondence: 0.8,
  daily: 1.0,
  rapid: 0.9,
  blitz: 0.5,
  bullet: 0.2,
};

/** Partite minime in un controllo perché il suo rating "conti". */
const MIN_CONTROL_GAMES = 5;
/** Tetto di partite per controllo nella pesatura della confidenza. */
const CONTROL_GAMES_CAP = 150;

/** Un rating per singolo controllo di tempo, normalizzato fra le due piattaforme. */
export interface ControlRating {
  /** 'rapid' | 'blitz' | 'classical' | 'bullet' | 'daily' | 'correspondence' */
  control: string;
  rating: number;
  games: number;
  provisional: boolean;
}

/** Esito della lettura di un account: rating per controllo + sintesi. */
export interface ExternalRatingReport {
  source: ExternalSource;
  username: string;
  controls: ControlRating[];
  /** Rating online rappresentativo (scala nativa della piattaforma). */
  representative: number;
  /** Partite valutate dietro alla stima (somma dei controlli usati). */
  nGames: number;
  /** Rating rappresentativo deflazionato a Elo OTB severo. */
  otb: number;
}

/**
 * Sceglie un rating rappresentativo dai controlli disponibili, pesando i tempi
 * lenti e la numerosità del campione. Ignora i controlli provvisori o con poche
 * partite. Ritorna `null` se nessun controllo è abbastanza solido.
 */
export function pickRepresentative(
  controls: ControlRating[],
): { representative: number; nGames: number } | null {
  let weightSum = 0;
  let weightedRating = 0;
  let nGames = 0;
  for (const c of controls) {
    if (c.provisional) continue;
    if (c.games < MIN_CONTROL_GAMES) continue;
    const cw = CONTROL_WEIGHT[c.control] ?? 0;
    if (cw === 0) continue;
    const conf = Math.min(c.games, CONTROL_GAMES_CAP);
    const w = cw * conf;
    weightSum += w;
    weightedRating += w * c.rating;
    nGames += c.games;
  }
  if (weightSum === 0) return null;
  return { representative: Math.round(weightedRating / weightSum), nGames };
}

// ============================================================
// Lichess
// ============================================================

interface LichessPerf {
  games?: number;
  rating?: number;
  prov?: boolean;
}
interface LichessUser {
  username?: string;
  disabled?: boolean;
  perfs?: Record<string, LichessPerf>;
  profile?: { bio?: string; links?: string; realName?: string };
}

const LICHESS_CONTROLS = ["bullet", "blitz", "rapid", "classical", "correspondence"] as const;

async function fetchLichessUser(username: string): Promise<LichessUser> {
  let res: Response;
  try {
    res = await fetch(
      `https://lichess.org/api/user/${encodeURIComponent(username)}`,
      { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(15_000) },
    );
  } catch {
    throw new ProviderError("network", "Network error or timeout contacting Lichess.");
  }
  if (res.status === 404) {
    throw new ProviderError("not_found", `Lichess user "${username}" not found.`);
  }
  if (res.status === 429) {
    throw new ProviderError("rate_limit", "Too many requests to Lichess. Try again shortly.");
  }
  if (!res.ok) {
    throw new ProviderError("network", `Lichess responded with status ${res.status}.`);
  }
  return (await res.json()) as LichessUser;
}

// ============================================================
// Chess.com
// ============================================================

interface ChesscomFormat {
  last?: { rating?: number; rd?: number };
  record?: { win?: number; loss?: number; draw?: number };
}
interface ChesscomStats {
  chess_bullet?: ChesscomFormat;
  chess_blitz?: ChesscomFormat;
  chess_rapid?: ChesscomFormat;
  chess_daily?: ChesscomFormat;
}

const CHESSCOM_UA = "Shakh/1.0 (https://shakh.app)";
const CHESSCOM_CONTROLS: ReadonlyArray<readonly [keyof ChesscomStats, string]> = [
  ["chess_bullet", "bullet"],
  ["chess_blitz", "blitz"],
  ["chess_rapid", "rapid"],
  ["chess_daily", "daily"],
];

async function fetchChesscomStats(username: string): Promise<ChesscomStats> {
  const user = encodeURIComponent(username.toLowerCase());
  let res: Response;
  try {
    res = await fetch(`https://api.chess.com/pub/player/${user}/stats`, {
      headers: { "User-Agent": CHESSCOM_UA, Accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new ProviderError("network", "Network error or timeout contacting Chess.com.");
  }
  if (res.status === 404) {
    throw new ProviderError("not_found", `Chess.com user "${username}" not found.`);
  }
  if (res.status === 429) {
    throw new ProviderError("rate_limit", "Too many requests to Chess.com. Try again shortly.");
  }
  if (!res.ok) {
    throw new ProviderError("network", `Chess.com responded with status ${res.status}.`);
  }
  return (await res.json()) as ChesscomStats;
}

interface ChesscomPlayer {
  name?: string;
  location?: string;
}

async function fetchChesscomPlayer(username: string): Promise<ChesscomPlayer> {
  const user = encodeURIComponent(username.toLowerCase());
  let res: Response;
  try {
    res = await fetch(`https://api.chess.com/pub/player/${user}`, {
      headers: { "User-Agent": CHESSCOM_UA, Accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new ProviderError("network", "Network error or timeout contacting Chess.com.");
  }
  if (res.status === 404) {
    throw new ProviderError("not_found", `Chess.com user "${username}" not found.`);
  }
  if (res.status === 429) {
    throw new ProviderError("rate_limit", "Too many requests to Chess.com. Try again shortly.");
  }
  if (!res.ok) {
    throw new ProviderError("network", `Chess.com responded with status ${res.status}.`);
  }
  return (await res.json()) as ChesscomPlayer;
}

/**
 * Legge il testo pubblico del profilo dove l'utente può inserire il token di
 * verifica: su Lichess la bio (+ links + realName); su Chess.com i campi liberi
 * `name` e `location` (l'API pubblica non espone la sezione "about"). Restituisce
 * il testo concatenato in cui cercare il token.
 */
export async function fetchProfileText(
  source: ExternalSource,
  username: string,
): Promise<string> {
  if (source === "lichess") {
    const u = await fetchLichessUser(username.trim());
    const p = u.profile ?? {};
    return [p.bio, p.links, p.realName].filter(Boolean).join(" \n ");
  }
  const p = await fetchChesscomPlayer(username.trim());
  return [p.name, p.location].filter(Boolean).join(" \n ");
}

// ============================================================
// API pubblica del modulo
// ============================================================

/**
 * Scarica i rating di un account online e produce un report completo, incluso
 * il rating rappresentativo e la sua conversione a Elo OTB. Lancia `ProviderError`
 * (`not_found`, `rate_limit`, `network`) o `ProviderError('unsupported', …)` se
 * l'account non ha partite valutate sufficienti per stimare un rating.
 */
export async function fetchExternalRating(
  source: ExternalSource,
  username: string,
): Promise<ExternalRatingReport> {
  const trimmed = username.trim();
  let controls: ControlRating[];

  if (source === "lichess") {
    const u = await fetchLichessUser(trimmed);
    if (u.disabled) throw new ProviderError("not_found", "Lichess account closed.");
    const perfs = u.perfs ?? {};
    controls = LICHESS_CONTROLS.map((control) => {
      const p = perfs[control] ?? {};
      return {
        control,
        rating: p.rating ?? 0,
        games: p.games ?? 0,
        provisional: p.prov === true,
      };
    }).filter((c) => c.rating > 0);
  } else {
    const s = await fetchChesscomStats(trimmed);
    controls = CHESSCOM_CONTROLS.map(([key, control]) => {
      const f = s[key];
      const rec = f?.record;
      const games = (rec?.win ?? 0) + (rec?.loss ?? 0) + (rec?.draw ?? 0);
      return {
        control,
        rating: f?.last?.rating ?? 0,
        games,
        // Chess.com non espone un flag "provisional": lo deduciamo dal campione.
        provisional: games < MIN_CONTROL_GAMES,
      };
    }).filter((c) => c.rating > 0);
  }

  const rep = pickRepresentative(controls);
  if (!rep) {
    throw new ProviderError(
      "unsupported",
      "No time control with enough rated games to estimate a rating.",
    );
  }

  return {
    source,
    username: trimmed,
    controls,
    representative: rep.representative,
    nGames: rep.nGames,
    otb: externalToOtb(rep.representative, source),
  };
}
