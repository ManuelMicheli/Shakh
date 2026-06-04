import { cn } from "@/lib/utils";

export interface DistributionBarProps {
  inaccuracies: number;
  mistakes: number;
  blunders: number;
  className?: string;
}

// Eccezione monocromatica ammessa: i colori --eval-* comunicano un esito.
const SEGMENTS = [
  { key: "inaccuracies", label: "Inaccuracies", color: "var(--eval-inaccuracy)" },
  { key: "mistakes", label: "Mistakes", color: "var(--eval-mistake)" },
  { key: "blunders", label: "Blunders", color: "var(--eval-blunder)" },
] as const;

/** Distribuzione degli errori (imprecisioni/errori/gravi errori) in barra segmentata. */
export function DistributionBar({
  inaccuracies,
  mistakes,
  blunders,
  className,
}: DistributionBarProps) {
  const counts = { inaccuracies, mistakes, blunders };
  const total = inaccuracies + mistakes + blunders;

  if (total === 0) {
    return (
      <p className={cn("text-sm text-text-muted", className)}>
        No errors recorded: great, or not much data yet.
      </p>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-surface-2">
        {SEGMENTS.map((s) => {
          const n = counts[s.key];
          if (n === 0) return null;
          return (
            <div
              key={s.key}
              style={{ width: `${(n / total) * 100}%`, backgroundColor: s.color }}
              title={`${s.label}: ${n}`}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
        {SEGMENTS.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
            {s.label}: <span className="font-mono tabular-nums text-text">{counts[s.key]}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
