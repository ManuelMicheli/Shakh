/**
 * SHOWCASE (dev-only): galleria di tutti i glifi unicode usati come emblemi/
 * watermark nelle testate mobile, per rivederli in un colpo d'occhio. Statico.
 */

const GLYPHS: { glyph: string; name: string; pages: string }[] = [
  { glyph: "♞", name: "Cavallo", pages: "Dashboard · Sparring · Mediogioco" },
  { glyph: "♟", name: "Pedone", pages: "Oggi · Impara · Gioca · Gruppi" },
  { glyph: "♜", name: "Torre", pages: "Le mie partite · Punti deboli · Ripara" },
  { glyph: "♚", name: "Re", pages: "Percorso · Coach · Profilo · Finali" },
  { glyph: "♝", name: "Alfiere", pages: "Teoria · Preparazione · Repertorio · Aperture" },
  { glyph: "♛", name: "Donna", pages: "Tattiche" },
];

export default function GlifiGalleryPage() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Galleria glifi (unicode)
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          Tutti i simboli usati nelle testate. A sinistra l&apos;emblema (opacità
          20%, come ora), a destra il watermark grande (come la Dashboard).
        </p>
      </header>

      <div className="space-y-3">
        {GLYPHS.map((g) => (
          <div
            key={g.glyph}
            className="grid grid-cols-[1fr_auto_auto] items-center gap-4 rounded-xl border border-border bg-surface p-4"
          >
            <div className="min-w-0">
              <p className="font-display text-lg font-semibold">{g.name}</p>
              <p className="truncate text-xs text-text-muted">{g.pages}</p>
            </div>

            {/* Emblema (opacità 20%) */}
            <div className="flex h-24 w-20 items-center justify-center overflow-hidden rounded-lg bg-bg">
              <span
                aria-hidden
                className="select-none font-display text-[6rem] leading-none text-text opacity-20"
              >
                {g.glyph}
              </span>
            </div>

            {/* Pieno (per vedere la forma) */}
            <div className="flex h-24 w-20 items-center justify-center overflow-hidden rounded-lg bg-bg">
              <span
                aria-hidden
                className="select-none font-display text-[6rem] leading-none text-text"
              >
                {g.glyph}
              </span>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-text-muted">
        Colonna 1: emblema attuale (20%). Colonna 2: glifo pieno (100%) — per
        valutare la forma del simbolo nel font serif.
      </p>
    </div>
  );
}
