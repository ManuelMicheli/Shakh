import { ImageResponse } from "next/og";

/**
 * Render delle icone PWA a partire dall'unico glifo del pedone (lo stesso di
 * `src/app/icon.svg`, la silhouette del watermark "♟" della dashboard), senza
 * asset binari né dipendenze di rasterizzazione: Satori (next/og) disegna il
 * PNG a build/richiesta. Mantiene il monocromo del design system (sfondo
 * #0e0e0e, pezzo bianco con leggera sfumatura verticale) — nessun colore accent.
 */

// Solo il pezzo (niente rect di sfondo): sta su uno sfondo pieno gestito qui.
const PAWN_PIECE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
  <defs>
    <linearGradient id="p" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#d1d1d1"/>
    </linearGradient>
  </defs>
  <g fill="url(#p)">
    <path d="M24.5 14.5C24.5 16.5 28.1 16.8 28.5 18.5C28.5 20.2 25.3 19.6 25.3 21C25.3 26 31.1 28 31.1 33.5C31.1 34.2 29.9 34 29.9 34.5C29.9 35.6 31.9 37 32.9 37L32.9 38.5L12.1 38.5L12.1 37C13.1 37 15.1 35.6 15.1 34.5C15.1 34 13.9 34.2 13.9 33.5C13.9 28 19.7 26 19.7 21C19.7 19.6 16.5 20.2 16.5 18.5C16.9 16.8 20.5 16.5 20.5 14.5Z"/>
    <circle cx="22.5" cy="11" r="5.4"/>
  </g>
</svg>`;

const PAWN_DATA_URI = `data:image/svg+xml;base64,${Buffer.from(
  PAWN_PIECE,
).toString("base64")}`;

/** Colore di brand condiviso da icone, theme-color e splash. */
export const PWA_BG = "#0e0e0e";

type RenderOpts = {
  /** Lato del PNG in px (quadrato). */
  size: number;
  /** Quota del lato occupata dal pezzo (0..1). Più piccolo per le maskable. */
  scale?: number;
  /** Angoli arrotondati (icone standard). Le maskable/apple restano quadrate. */
  rounded?: boolean;
};

export function renderIcon({ size, scale = 0.7, rounded = false }: RenderOpts) {
  const inner = Math.round(size * scale);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: PWA_BG,
          borderRadius: rounded ? Math.round(size * 0.22) : 0,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img width={inner} height={inner} src={PAWN_DATA_URI} alt="" />
      </div>
    ),
    { width: size, height: size },
  );
}
