/**
 * Testata di pagina per telefono (mobile-only): impaginazione editoriale —
 * occhiello, titolo display, descrizione — con un glifo di pezzo come emblema a
 * destra, libero dal testo (non sovrapposto). Coerente su tutte le pagine.
 *
 * Mostrata solo sotto `md`; su desktop ogni pagina mantiene la propria testata
 * (di norma avvolta in `hidden md:block`).
 */
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
  /** Glifo unicode di un pezzo (es. "♞", "♛", "♝"): emblema della pagina. */
  glyph: string;
}) {
  return (
    <div className="flex items-start justify-between gap-2 md:hidden">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-xs uppercase tracking-wider text-text-muted">{eyebrow}</p>
        )}
        <h1 className="mt-0.5 font-display text-[1.7rem] font-semibold leading-tight tracking-tight">
          {title}
        </h1>
        {desc && <p className="mt-2 text-sm text-text-muted">{desc}</p>}
      </div>
      <span
        aria-hidden
        className="-mt-4 shrink-0 select-none font-display text-[9rem] leading-none text-text opacity-20"
      >
        {glyph}
      </span>
    </div>
  );
}
