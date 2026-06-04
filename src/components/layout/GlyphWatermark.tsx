/**
 * Glifo di pagina: simbolo unicode del pezzo in font display (serif), reso come
 * grande watermark dietro al testo. STILE UNICO, identico su tutte le pagine che
 * lo hanno e identico alla galleria glifi. Va dentro un contenitore `relative`.
 */
export function GlyphWatermark({ glyph }: { glyph: string }) {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute right-0 top-1 select-none font-display text-[13rem] leading-[0.78] text-text opacity-[0.08]"
    >
      {glyph}
    </span>
  );
}
