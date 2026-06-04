import { ImageResponse } from "next/og";

/**
 * Render delle icone PWA a partire dall'unico glifo del cavallo (lo stesso di
 * `src/app/icon.svg`), senza asset binari né dipendenze di rasterizzazione:
 * Satori (next/og) disegna il PNG a build/richiesta. Mantiene il monocromo del
 * design system (sfondo #0e0e0e, pezzo #fafafa) — nessun colore accent.
 */

// Solo il pezzo (niente rect di sfondo): sta su uno sfondo pieno gestito qui.
const KNIGHT_PIECE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
  <path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" fill="#fafafa" stroke="#0e0e0e" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
  <g fill="none" stroke="#bdbdbd" stroke-width="1.1" stroke-linecap="round">
    <path d="M18.9 20.4c2.3 1.2 4.6 1.2 7.2 0"/>
    <path d="M12.6 35.6h19.8"/>
  </g>
</svg>`;

const KNIGHT_DATA_URI = `data:image/svg+xml;base64,${Buffer.from(
  KNIGHT_PIECE,
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
        <img width={inner} height={inner} src={KNIGHT_DATA_URI} alt="" />
      </div>
    ),
    { width: size, height: size },
  );
}
