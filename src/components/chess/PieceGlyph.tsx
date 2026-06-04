import { PIECE_SVG, type PieceName } from "./pieceAssets";
import { cn } from "@/lib/utils";

/**
 * Stile UNICO del glifo di pagina: grande watermark dietro al testo, in alto a
 * destra, opacità 8%. Usato identico su tutte le pagine che hanno il glifo, così
 * sono perfettamente coerenti. Posizionare in un contenitore `relative`.
 */
export const PIECE_WATERMARK =
  "absolute right-0 top-0 h-48 w-48 opacity-[0.08]";

/**
 * Glifo/emblema di pagina reso col vettore del pezzo (set cburnett della
 * scacchiera): IDENTICO e nitido su ogni dispositivo, a differenza del simbolo
 * unicode che dipende dal font di sistema. Theme-aware: pezzo bianco su tema
 * scuro, pezzo nero su tema chiaro. La dimensione/opacità si passano via
 * `className` (es. `h-48 w-48 opacity-[0.07]` per il watermark grande,
 * `h-24 w-24 opacity-25` per l'emblema).
 */
export function PieceGlyph({
  piece,
  className,
}: {
  piece: PieceName;
  className?: string;
}) {
  const set = PIECE_SVG[piece];
  return (
    <span
      aria-hidden
      className={cn("pointer-events-none block select-none", className)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={set.white}
        alt=""
        className="hidden h-full w-full object-contain dark:block"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={set.black}
        alt=""
        className="block h-full w-full object-contain dark:hidden"
      />
    </span>
  );
}
