"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

export interface RosterStudent {
  userId: string;
  name: string;
  role: "member" | "instructor" | "owner";
  level: number;
  tacticRating: number | null;
  accuracy: number | null;
  lastActivity: string | null;
}

type SortKey = "name" | "level" | "tacticRating" | "accuracy" | "lastActivity";

const HEADERS: { key: SortKey; labelKey: string; numeric: boolean }[] = [
  { key: "name", labelKey: "rosterStudent", numeric: false },
  { key: "level", labelKey: "rosterLevel", numeric: true },
  { key: "tacticRating", labelKey: "rosterRating", numeric: true },
  { key: "accuracy", labelKey: "rosterAccuracy", numeric: true },
  { key: "lastActivity", labelKey: "rosterLastActivity", numeric: true },
];

function fmtAccuracy(v: number | null): string {
  return v == null ? "—" : `${Math.round(v * 100)}%`;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { day: "2-digit", month: "2-digit" });
}

/** Elenco allievi ordinabile (prompt 09 §4): chi è avanti, chi è indietro. */
export function ClassRoster({
  groupId,
  students,
}: {
  groupId: string;
  students: RosterStudent[];
}) {
  const t = useTranslations("groups");
  const [sort, setSort] = useState<SortKey>("level");
  const [asc, setAsc] = useState(true);

  const sorted = useMemo(() => {
    const arr = [...students];
    arr.sort((a, b) => {
      let cmp: number;
      if (sort === "name") cmp = a.name.localeCompare(b.name);
      else {
        const av = a[sort] ?? -Infinity;
        const bv = b[sort] ?? -Infinity;
        cmp = (av as number) - (bv as number);
      }
      return asc ? cmp : -cmp;
    });
    return arr;
  }, [students, sort, asc]);

  const onSort = (key: SortKey) => {
    if (key === sort) setAsc((v) => !v);
    else {
      setSort(key);
      setAsc(key === "name");
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-muted">
            {HEADERS.map((h) => (
              <th key={h.key} className={h.numeric ? "py-2 pr-4 text-right" : "py-2 pr-4"}>
                <button
                  type="button"
                  onClick={() => onSort(h.key)}
                  className="inline-flex items-center gap-1 hover:text-text"
                >
                  {t(h.labelKey)}
                  {sort === h.key && <span aria-hidden>{asc ? "↑" : "↓"}</span>}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {sorted.map((s) => (
            <tr key={s.userId} className="hover:bg-surface-2">
              <td className="py-2.5 pr-4">
                <Link
                  href={`/app/gruppi/${groupId}/allievi/${s.userId}`}
                  className="font-medium hover:underline"
                >
                  {s.name}
                </Link>
              </td>
              <td className="py-2.5 pr-4 text-right tabular-nums">{s.level}</td>
              <td className="py-2.5 pr-4 text-right tabular-nums">{s.tacticRating ?? "—"}</td>
              <td className="py-2.5 pr-4 text-right tabular-nums">{fmtAccuracy(s.accuracy)}</td>
              <td className="py-2.5 pr-4 text-right font-mono text-xs text-text-muted">
                {fmtDate(s.lastActivity)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
