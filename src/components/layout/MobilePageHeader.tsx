/**
 * Testata di pagina per telefono (mobile-only): impaginazione editoriale —
 * occhiello, titolo display, descrizione — con, sulle pagine principali, il
 * pezzo come grande watermark dietro al testo (stile unico, identico ovunque).
 * Se `piece` è assente non c'è glifo (pagine secondarie).
 *
 * Mostrata solo sotto `md`; su desktop ogni pagina mantiene la propria testata
 * (di norma avvolta in `hidden md:block`).
 */
import { PieceGlyph, PIECE_WATERMARK } from "@/components/chess/PieceGlyph";
import type { PieceName } from "@/components/chess/pieceAssets";

export function MobilePageHeader({
  eyebrow,
  title,
  desc,
  piece,
}: {
  /** Occhiello breve sopra il titolo (maiuscoletto). */
  eyebrow?: string;
  title: string;
  desc?: string;
  /** Pezzo della pagina come watermark. Assente = nessun glifo. */
  piece?: PieceName;
}) {
  return (
    <div className="relative md:hidden">
      {piece && <PieceGlyph piece={piece} className={PIECE_WATERMARK} />}
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
