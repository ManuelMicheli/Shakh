/**
 * Testata di pagina per telefono (mobile-only): impaginazione editoriale —
 * occhiello, titolo display, descrizione. Nessun glifo (resta solo il cavallo
 * watermark sulla Dashboard).
 *
 * Mostrata solo sotto `md`; su desktop ogni pagina mantiene la propria testata
 * (di norma avvolta in `hidden md:block`).
 */
export function MobilePageHeader({
  eyebrow,
  title,
  desc,
}: {
  /** Occhiello breve sopra il titolo (maiuscoletto). */
  eyebrow?: string;
  title: string;
  desc?: string;
}) {
  return (
    <div className="md:hidden">
      {eyebrow && (
        <p className="text-xs uppercase tracking-wider text-text-muted">{eyebrow}</p>
      )}
      <h1 className="mt-0.5 font-display text-[1.7rem] font-semibold leading-tight tracking-tight">
        {title}
      </h1>
      {desc && <p className="mt-2 text-sm text-text-muted">{desc}</p>}
    </div>
  );
}
