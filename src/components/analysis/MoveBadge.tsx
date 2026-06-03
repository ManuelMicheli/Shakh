/**
 * Badge di qualità mossa in stile "review": cerchio colorato (token `--eval-*`)
 * con dentro il simbolo della categoria — testo NAG (!!, !, ?!, ?, ??) oppure
 * un'icona vettoriale (libro, stella, spunta, doppia spunta, croce).
 *
 * Riusa `CLASSIFICATION_META` come unica fonte di label/colore/simbolo.
 * Componente puro (nessuno stato): usabile in RSC e Client Component.
 */

import type { Classification } from "@/lib/games/types";
import { CLASSIFICATION_META, type BadgeIcon } from "@/lib/analysis/labels";
import { cn } from "@/lib/utils";

interface MoveBadgeProps {
  classification: Classification;
  /** Diametro in px (default 18). */
  size?: number;
  className?: string;
}

/** Icone vettoriali del badge: tracciate in bianco su sfondo colorato. */
export function BadgeGlyph({ icon }: { icon: BadgeIcon }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "#fff",
    strokeWidth: 3,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    width: "62%",
    height: "62%",
  };
  switch (icon) {
    case "star":
      return (
        <svg {...common} fill="#fff" stroke="none">
          <path d="M12 3.5l2.6 5.27 5.82.85-4.21 4.1.99 5.8L12 16.8l-5.2 2.73.99-5.8-4.21-4.1 5.82-.85z" />
        </svg>
      );
    case "check":
      return (
        <svg {...common}>
          <path d="M5 13l4 4L19 7" />
        </svg>
      );
    case "check-double":
      return (
        <svg {...common}>
          <path d="M2 13l4 4 8-9" />
          <path d="M11 17l1.5 1.5L22 8" />
        </svg>
      );
    case "cross":
      return (
        <svg {...common}>
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      );
    case "book":
      return (
        <svg {...common} strokeWidth={2}>
          <path d="M12 6.5C10.5 5 8 4.5 4.5 4.8V18c3.5-.3 6 .2 7.5 1.7 1.5-1.5 4-2 7.5-1.7V4.8C16 4.5 13.5 5 12 6.5z" />
          <path d="M12 6.5V19.7" />
        </svg>
      );
  }
}

/** Cerchio colorato con simbolo o icona, label accessibile dal `title`. */
export function MoveBadge({ classification, size = 18, className }: MoveBadgeProps) {
  const meta = CLASSIFICATION_META[classification];
  return (
    <span
      role="img"
      aria-label={meta.label}
      title={meta.label}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-sans font-extrabold leading-none text-white",
        className,
      )}
      style={{
        width: size,
        height: size,
        backgroundColor: meta.color,
        fontSize: size * 0.5,
        letterSpacing: "-0.04em",
      }}
    >
      {meta.icon ? <BadgeGlyph icon={meta.icon} /> : meta.glyph}
    </span>
  );
}
