import { cn } from "@/lib/utils";

export interface StatTileProps {
  label: string;
  value: string;
  /** Sottotitolo opzionale sotto al valore. */
  sub?: string;
  /** Delta numerico: positivo ◢ in accento, negativo ◥ attenuato (DESIGN.md). */
  delta?: number | null;
  className?: string;
}

/** Tessera di una singola metrica: valore grande + etichetta (+ delta opzionale). */
export function StatTile({ label, value, sub, delta, className }: StatTileProps) {
  return (
    <div className={cn("rounded-lg border border-border bg-surface p-4", className)}>
      <p className="text-xs uppercase tracking-wide text-text-muted">{label}</p>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="font-display text-2xl font-semibold tabular-nums">{value}</span>
        {delta != null && delta !== 0 && (
          <span
            className={cn(
              "font-mono text-xs tabular-nums",
              delta > 0 ? "text-accent" : "text-text-muted",
            )}
          >
            {delta > 0 ? "◢" : "◥"} {Math.abs(delta)}
          </span>
        )}
      </div>
      {sub && <p className="mt-1 text-xs text-text-muted">{sub}</p>}
    </div>
  );
}
