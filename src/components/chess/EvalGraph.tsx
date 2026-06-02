"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import type { Classification } from "@/lib/games/types";
import { CLASSIFICATION_META } from "@/lib/analysis/labels";
import { cn } from "@/lib/utils";

export interface EvalPoint {
  /** Cursore della posizione MOSTRATA (−1 = iniziale, k = dopo la (k+1)-esima mossa). */
  cursor: number;
  /** Valutazione white-relative in centipawn, già limitata (cap). */
  cp: number;
  classification: Classification | null;
}

export interface EvalGraphProps {
  points: EvalPoint[];
  /** Cursore attualmente selezionato. */
  cursor: number;
  onSelect: (cursor: number) => void;
  /** Limite cp (= altezza piena del grafico). */
  cap?: number;
  className?: string;
}

const W = 1000;
const H = 140;

/**
 * Grafico dell'andamento della valutazione — SVG disegnato a mano (niente
 * librerie di charting). Linea white-relative, punti d'errore evidenziati e
 * cliccabili per saltare alla mossa.
 */
export function EvalGraph({
  points,
  cursor,
  onSelect,
  cap = 1000,
  className,
}: EvalGraphProps) {
  const geom = useMemo(() => {
    const n = points.length;
    const x = (i: number) => (n <= 1 ? W / 2 : (i / (n - 1)) * W);
    const y = (cp: number) => {
      const clamped = Math.max(-cap, Math.min(cap, cp));
      return H / 2 - (clamped / cap) * (H / 2);
    };
    const coords = points.map((p, i) => ({ ...p, px: x(i), py: y(p.cp) }));
    const line = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.px.toFixed(1)} ${c.py.toFixed(1)}`).join(" ");
    const area = coords.length
      ? `${line} L ${coords[coords.length - 1].px.toFixed(1)} ${H / 2} L ${coords[0].px.toFixed(1)} ${H / 2} Z`
      : "";
    return { coords, line, area };
  }, [points, cap]);

  if (points.length === 0) {
    return (
      <div className={cn("font-mono text-sm text-text-muted", className)}>
        Nessun dato d&apos;analisi.
      </div>
    );
  }

  const activeX =
    geom.coords.find((c) => c.cursor === cursor)?.px ??
    (cursor < 0 ? 0 : undefined);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className={cn("h-32 w-full select-none", className)}
      role="img"
      aria-label="Andamento della valutazione"
    >
      {/* Metà superiore = vantaggio Bianco, inferiore = vantaggio Nero. */}
      <rect x="0" y="0" width={W} height={H / 2} fill="var(--surface)" />
      <rect x="0" y={H / 2} width={W} height={H / 2} fill="var(--surface-2)" />
      <line x1="0" y1={H / 2} x2={W} y2={H / 2} stroke="var(--border)" strokeWidth="1" />

      {/* Area sotto la curva + linea. */}
      <path d={geom.area} fill="color-mix(in srgb, var(--text) 10%, transparent)" />
      <motion.path
        d={geom.line}
        fill="none"
        stroke="var(--text)"
        strokeWidth="2"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      />

      {/* Indicatore della posizione corrente. */}
      {activeX != null && (
        <line
          x1={activeX}
          y1="0"
          x2={activeX}
          y2={H}
          stroke="var(--text)"
          strokeWidth="1"
          strokeDasharray="3 3"
          vectorEffect="non-scaling-stroke"
          opacity={0.6}
        />
      )}

      {/* Punti d'errore (blunder/mistake/inaccuracy) + bersagli cliccabili ovunque. */}
      {geom.coords.map((c, i) => {
        const meta = c.classification ? CLASSIFICATION_META[c.classification] : null;
        const showDot =
          c.classification === "blunder" ||
          c.classification === "mistake" ||
          c.classification === "inaccuracy";
        return (
          <g key={i}>
            {showDot && meta && (
              <circle cx={c.px} cy={c.py} r="5" fill={meta.color} vectorEffect="non-scaling-stroke" />
            )}
            <circle
              cx={c.px}
              cy={c.py}
              r="14"
              fill="transparent"
              className="cursor-pointer"
              onClick={() => onSelect(c.cursor)}
            >
              <title>mossa {c.cursor + 1}</title>
            </circle>
          </g>
        );
      })}
    </svg>
  );
}
