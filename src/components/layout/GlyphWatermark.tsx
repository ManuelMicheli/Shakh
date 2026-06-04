/**
 * Glifo di pagina: simbolo unicode del pezzo in font display (serif), reso come
 * emblema NITIDO (100% opacità) accanto al titolo, allineato a destra sulla riga
 * della testata. STILE UNICO, identico su tutte le pagine che lo hanno e identico
 * alla galleria glifi (colonna piena). Va dentro un contenitore `relative`; il
 * blocco testo accanto resta su un livello `relative` così il titolo gli scorre a
 * sinistra senza sovrapporsi.
 */
export function GlyphWatermark({ glyph }: { glyph: string }) {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute right-0 top-3 select-none font-display text-[2.75rem] leading-none text-text"
    >
      {glyph}
    </span>
  );
}
