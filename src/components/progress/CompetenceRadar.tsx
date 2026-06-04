"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export interface RadarArea {
  label: string;
  /** Competenza 0..1, o null se nessun dato. */
  value: number | null;
}

export interface CompetenceRadarProps {
  areas: RadarArea[];
  className?: string;
}

const SIZE = 240;
const C = SIZE / 2;
const R = 92;
const RINGS = [0.25, 0.5, 0.75, 1];

/** Punto sull'asse `i` (di `n`) a raggio proporzionale a `t` (0..1). Parte dall'alto. */
function point(i: number, n: number, t: number): [number, number] {
  const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
  return [C + Math.cos(angle) * R * t, C + Math.sin(angle) * R * t];
}

function polygon(pts: [number, number][]): string {
  return pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
}

/**
 * Radar delle competenze per area — SVG inline, niente librerie di charting.
 * Monocromo (grigi/contrasto): il colore qui non rappresenta un esito.
 */
export function CompetenceRadar({ areas, className }: CompetenceRadarProps) {
  const t = useTranslations("dashboard");
  const n = areas.length;
  const geom = useMemo(() => {
    const valuePts = areas.map((a, i) => point(i, n, a.value ?? 0));
    const axisPts = areas.map((_, i) => point(i, n, 1));
    const labelPts = areas.map((_, i) => point(i, n, 1.18));
    return { valuePts, axisPts, labelPts };
  }, [areas, n]);

  const hasData = areas.some((a) => a.value != null && a.value > 0);

  return (
    <div className={cn("flex justify-center", className)}>
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="h-auto w-full max-w-[280px]"
        role="img"
        aria-label={t("skillsMap.title")}
      >
        {/* Anelli della griglia. */}
        {RINGS.map((t) => (
          <polygon
            key={t}
            points={polygon(areas.map((_, i) => point(i, n, t)))}
            fill="none"
            stroke="var(--border)"
            strokeWidth="1"
          />
        ))}
        {/* Assi. */}
        {geom.axisPts.map(([x, y], i) => (
          <line key={i} x1={C} y1={C} x2={x} y2={y} stroke="var(--border)" strokeWidth="1" />
        ))}

        {/* Poligono delle competenze. */}
        {hasData && (
          <motion.polygon
            points={polygon(geom.valuePts)}
            fill="color-mix(in srgb, var(--text) 14%, transparent)"
            stroke="var(--text)"
            strokeWidth="2"
            strokeLinejoin="round"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            style={{ transformOrigin: "center" }}
          />
        )}
        {hasData &&
          geom.valuePts.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="3" fill="var(--text)" />
          ))}

        {/* Etichette delle aree. */}
        {areas.map((a, i) => {
          const [x, y] = geom.labelPts[i];
          const anchor = x < C - 4 ? "end" : x > C + 4 ? "start" : "middle";
          return (
            <text
              key={a.label}
              x={x}
              y={y}
              textAnchor={anchor}
              dominantBaseline="middle"
              className="fill-text-muted text-[9px]"
              fill="var(--text-muted)"
            >
              {a.label}
              {a.value != null ? ` ${Math.round(a.value * 100)}` : ""}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
