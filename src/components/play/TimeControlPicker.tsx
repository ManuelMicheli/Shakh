"use client";

import { TIME_CONTROLS } from "@/lib/play/time-controls";
import { cn } from "@/lib/utils";

export interface TimeControlPickerProps {
  value: string;
  onChange: (id: string) => void;
}

/** Selettore del controllo di tempo, raggruppato per categoria. */
export function TimeControlPicker({ value, onChange }: TimeControlPickerProps) {
  const groups = Array.from(new Set(TIME_CONTROLS.map((t) => t.group)));
  return (
    <div className="space-y-3">
      {groups.map((g) => (
        <div key={g}>
          <div className="mb-1.5 text-xs uppercase tracking-wide text-text-muted">
            {g}
          </div>
          <div className="flex flex-wrap gap-2">
            {TIME_CONTROLS.filter((t) => t.group === g).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onChange(t.id)}
                aria-pressed={value === t.id}
                className={cn(
                  "rounded-md border px-3 py-1.5 font-mono text-sm transition-colors",
                  value === t.id
                    ? "border-text bg-text text-bg"
                    : "border-border text-text-muted hover:text-text",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
