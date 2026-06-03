/**
 * Payload AUTOCONTENUTO di un reel: tutto ciò che serve per riprodurre la
 * clip sta nell'URL (niente DB, niente auth, niente esposizione dell'intera
 * partita). Codifica base64 cross-ambiente (server Node + browser).
 */

export interface ReelData {
  /** Posizioni consecutive (FEN) da animare, dalla preparazione alla mossa chiave. */
  fens: string[];
  /** Origine/destinazione della mossa chiave (per l'evidenziazione). */
  from: string;
  to: string;
  /** Etichetta della mossa (es. "brilliant"|"best"). */
  label: string;
  /** SAN della mossa chiave. */
  san: string;
  /** Valutazione formattata dopo la mossa (es. "+2.4"). */
  evalText: string;
  orientation: "white" | "black";
  /** Titolo libero (es. nomi giocatori). */
  title?: string;
}

function b64encode(s: string): string {
  if (typeof Buffer !== "undefined") return Buffer.from(s, "utf8").toString("base64");
  return btoa(unescape(encodeURIComponent(s)));
}

function b64decode(s: string): string {
  if (typeof Buffer !== "undefined") return Buffer.from(s, "base64").toString("utf8");
  return decodeURIComponent(escape(atob(s)));
}

/** Serializza il reel in una stringa pronta per il parametro `?d=`. */
export function encodeReel(data: ReelData): string {
  return b64encode(JSON.stringify(data));
}

/** Deserializza il payload; null se assente o non valido. */
export function decodeReel(raw: string | null | undefined): ReelData | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(b64decode(raw)) as ReelData;
    if (!Array.isArray(data.fens) || data.fens.length === 0) return null;
    return data;
  } catch {
    return null;
  }
}
