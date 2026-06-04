"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export interface TrendPoint {
  label: string;
  value: number;
}

export interface TrendLineProps {
  points: TrendPoint[];
  /** Suffisso del valore nei tooltip (es. "%"). */
  suffix?: string;
  /**
   * Nome del dato dietro un punto (singolare/plurale), per lo stato vuoto:
   * "Serve ancora 1 partita…" / "Servono ancora 2 puzzle…".
   * Se omesso, usa un nome generico localizzato.
   */
  dataNoun?: { one: string; many: string };
  className?: string;
}

const W = 600;
const H = 160;
const PAD = 16;

/**
 * Grafico a linee — SVG inline, niente librerie di charting. Monocromo:
 * andamento di rating o accuratezza nel tempo, con punti e tooltip nativi.
 */
export function TrendLine({
  points,
  suffix = "",
  dataNoun,
  className,
}: TrendLineProps) {
  const t = useTranslations("dashboard");
  // Nome del dato di default (singolare/plurale) localizzato; sovrascrivibile da chi chiama.
  const noun = dataNoun ?? { one: t("trend.nounOne"), many: t("trend.nounMany") };
  const geom = useMemo(() => {
    const n = points.length;
    const values = points.map((p) => p.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    const x = (i: number) => (n <= 1 ? W / 2 : PAD + (i / (n - 1)) * (W - 2 * PAD));
    const y = (v: number) => PAD + (1 - (v - min) / span) * (H - 2 * PAD);
    const coords = points.map((p, i) => ({ ...p, px: x(i), py: y(p.value) }));
    const line = coords
      .map((c, i) => `${i === 0 ? "M" : "L"} ${c.px.toFixed(1)} ${c.py.toFixed(1)}`)
      .join(" ");
    return { coords, line, min, max };
  }, [points]);

  if (points.length < 2) {
    const missing = 2 - points.length;
    return (
      <p className={cn("py-8 text-center text-sm text-text-muted", className)}>
        {missing === 1
          ? t("trend.needOne", { noun: noun.one })
          : t("trend.needMany", { missing, noun: noun.many })}
      </p>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      <div className="mb-1 flex justify-between font-mono text-xs text-text-muted">
        <span>
          min {geom.min}
          {suffix}
        </span>
        <span>
          max {geom.max}
          {suffix}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="h-36 w-full select-none"
        role="img"
        aria-label={t("trend.ariaLabel")}
      >
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
        {geom.coords.map((c, i) => (
          <circle key={i} cx={c.px} cy={c.py} r="3" fill="var(--text)" vectorEffect="non-scaling-stroke">
            <title>
              {c.label}: {c.value}
              {suffix}
            </title>
          </circle>
        ))}
      </svg>
    </div>
  );
}
