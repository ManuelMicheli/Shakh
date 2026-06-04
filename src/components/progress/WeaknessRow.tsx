import Link from "next/link";
import { cn } from "@/lib/utils";

export interface WeaknessRowProps {
  label: string;
  /** Competenza 0..1. */
  score: number;
  attempts: number;
  action: { label: string; href: string };
  className?: string;
}

const ACTION_LINK =
  "inline-flex h-8 shrink-0 items-center rounded-md bg-text px-3 text-sm font-medium text-bg hover:opacity-90";

/** Riga "punto debole": etichetta + barra di competenza + azione diretta (loop). */
export function WeaknessRow({ label, score, attempts, action, className }: WeaknessRowProps) {
  const pct = Math.round(Math.max(0, Math.min(1, score)) * 100);
  return (
    <div className={cn("flex items-center gap-4 py-3", className)}>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-sm font-medium">{label}</span>
          <span className="font-mono text-xs text-text-muted">
            {pct}% · {attempts} attempts
          </span>
        </div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-2" aria-hidden>
          <div className="h-full rounded-full bg-text" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <Link href={action.href} className={ACTION_LINK}>
        {action.label}
      </Link>
    </div>
  );
}
