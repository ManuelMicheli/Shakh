/**
 * Testata di pagina per telefono (mobile-only): impaginazione editoriale —
 * occhiello, titolo display, descrizione — con, sulle pagine principali, il
 * glifo unicode del pezzo come grande watermark dietro al testo (stile unico,
 * identico ovunque e alla galleria). Se `glyph` è assente non c'è glifo.
 *
 * Mostrata solo sotto `md`; su desktop ogni pagina mantiene la propria testata
 * (di norma avvolta in `hidden md:block`).
 */
import { GlyphWatermark } from "./GlyphWatermark";

export function MobilePageHeader({
  eyebrow,
  title,
  desc,
  glyph,
}: {
  /** Occhiello breve sopra il titolo (maiuscoletto). */
  eyebrow?: string;
  title: string;
  desc?: string;
  /** Glifo unicode del pezzo (es. "♞"). Assente = nessun glifo. */
  glyph?: string;
}) {
  return (
    <div className="relative md:hidden">
      {glyph && <GlyphWatermark glyph={glyph} />}
      <div className="relative">
        {eyebrow && (
          <p className="text-xs uppercase tracking-wider text-text-muted">{eyebrow}</p>
        )}
        <h1 className="mt-0.5 font-display text-[1.7rem] font-semibold leading-tight tracking-tight">
          {title}
        </h1>
        {desc && <p className="mt-2 text-sm text-text-muted">{desc}</p>}
      </div>
    </div>
  );
}
