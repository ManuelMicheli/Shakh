/**
 * SHOWCASE (dev-only): galleria di tutti i glifi unicode usati come emblemi/
 * watermark nelle testate mobile, per rivederli in un colpo d'occhio. Statico.
 */

const GLYPHS: { glyph: string; name: string; pages: string }[] = [
  { glyph: "♞", name: "Knight", pages: "Dashboard · Sparring · Middlegame" },
  { glyph: "♟", name: "Pawn", pages: "Today · Learn · Play · Groups" },
  { glyph: "♜", name: "Rook", pages: "My games · Weaknesses · Fix mistakes" },
  { glyph: "♚", name: "King", pages: "Path · Coach · Profile · Endgames" },
  { glyph: "♝", name: "Bishop", pages: "Theory · Preparation · Repertoire · Openings" },
  { glyph: "♛", name: "Queen", pages: "Tactics" },
];

export default function GlifiGalleryPage() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Glyph gallery (unicode)
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          All the symbols used in the headers. On the left the emblem (20%
          opacity, as it is now), on the right the large watermark (like the
          Dashboard).
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
        Column 1: current emblem (20%). Column 2: solid glyph (100%) — to judge
        the shape of the symbol in the serif font.
      </p>
    </div>
  );
}
