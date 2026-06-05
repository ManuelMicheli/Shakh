"use client";

import { useId, useMemo } from "react";
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

const SIZE = 320;
const C = SIZE / 2;
const R = 108;
// Anelli della ragnatela: dal centro al bordo. Più anelli = trama più fitta.
const RINGS = [0.2, 0.4, 0.6, 0.8, 1];

/** Punto sull'asse `i` (di `n`) a raggio proporzionale a `t` (0..1). Parte dall'alto. */
function point(i: number, n: number, t: number): [number, number] {
  const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
  return [C + Math.cos(angle) * R * t, C + Math.sin(angle) * R * t];
}

function polygon(pts: [number, number][]): string {
  return pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
}

/**
 * Mappa delle competenze come "ragnatela" (radar) — SVG inline, niente librerie
 * di charting. Trama concentrica + raggi + area piena con gradiente; rigorosamente
 * monocroma (il colore qui non rappresenta un esito, da design system).
 */
export function CompetenceRadar({ areas, className }: CompetenceRadarProps) {
  const t = useTranslations("dashboard");
  const uid = useId();
  const fillId = `radar-fill-${uid}`;
  const glowId = `radar-glow-${uid}`;
  const n = areas.length;

  const geom = useMemo(() => {
    const valuePts = areas.map((a, i) => point(i, n, a.value ?? 0));
    const axisPts = areas.map((_, i) => point(i, n, 1));
    const labelPts = areas.map((_, i) => point(i, n, 1.16));
    return { valuePts, axisPts, labelPts };
  }, [areas, n]);

  const hasData = areas.some((a) => a.value != null && a.value > 0);

  return (
    <div className={cn("flex justify-center", className)}>
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="h-auto w-full max-w-[340px]"
        role="img"
        aria-label={t("skillsMap.title")}
      >
        <defs>
          {/* Riempimento dell'area: gradiente monocromo, più denso al centro. */}
          <radialGradient id={fillId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--text)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--text)" stopOpacity="0.06" />
          </radialGradient>
          <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Anelli della trama: dall'esterno (più marcato) al centro (più tenue). */}
        {RINGS.map((ring, idx) => (
          <polygon
            key={ring}
            points={polygon(areas.map((_, i) => point(i, n, ring)))}
            fill="none"
            stroke="var(--border)"
            strokeWidth={idx === RINGS.length - 1 ? 1.25 : 1}
            strokeOpacity={0.45 + 0.55 * (ring)}
            strokeLinejoin="round"
          />
        ))}

        {/* Raggi dal centro a ogni vertice. */}
        {geom.axisPts.map(([x, y], i) => (
          <line
            key={i}
            x1={C}
            y1={C}
            x2={x}
            y2={y}
            stroke="var(--border)"
            strokeWidth="1"
            strokeOpacity={0.7}
          />
        ))}

        {/* Area delle competenze: gradiente + contorno animato. */}
        {hasData && (
          <motion.polygon
            points={polygon(geom.valuePts)}
            fill={`url(#${fillId})`}
            stroke="var(--text)"
            strokeWidth="2"
            strokeLinejoin="round"
            filter={`url(#${glowId})`}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            style={{ transformOrigin: "center" }}
          />
        )}

        {/* Vertici: alone + punto pieno. */}
        {hasData &&
          geom.valuePts.map(([x, y], i) => (
            <g key={i}>
              <circle cx={x} cy={y} r="5" fill="var(--text)" opacity={0.12} />
              <circle
                cx={x}
                cy={y}
                r="3"
                fill="var(--surface)"
                stroke="var(--text)"
                strokeWidth="2"
              />
            </g>
          ))}

        {/* Etichette: nome area + percentuale su due righe. */}
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
            >
              <tspan
                x={x}
                dy="-0.35em"
                className="fill-text-muted text-[10px] font-medium uppercase tracking-wide"
                fill="var(--text-muted)"
              >
                {a.label}
              </tspan>
              <tspan
                x={x}
                dy="1.25em"
                className="fill-text font-mono text-[11px] font-semibold tabular-nums"
                fill="var(--text)"
              >
                {a.value != null ? `${Math.round(a.value * 100)}` : "—"}
              </tspan>
            </text>
          );
        })}
      </svg>
    </div>
  );
}
