"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  CATEGORY_LABEL,
  FAME_LABEL,
  FAME_ORDER,
  SIDE_LABEL,
  motifLabel,
  type TrapCategory,
  type TrapSide,
  type TrapSummary,
} from "@/lib/traps/types";

export interface TrapCatalogProps {
  traps: TrapSummary[];
}

type CatFilter = TrapCategory | "all";
type SideFilter = TrapSide | "all";

const CATEGORIES: CatFilter[] = [
  "all",
  "opening_trap",
  "gambit",
  "sacrifice",
  "swindle",
  "tactical_motif",
];

/**
 * Catalogo filtrabile delle trappole. Il filtraggio è lato client (il set
 * pubblicato è piccolo): cerca per nome/apertura, filtra per categoria, motivo,
 * lato e una manopola di notorietà (famose ↔ oscure).
 */
export function TrapCatalog({ traps }: TrapCatalogProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<CatFilter>("all");
  const [side, setSide] = useState<SideFilter>("all");
  const [motifs, setMotifs] = useState<Set<string>>(new Set());
  // Manopola notorietà: indice in FAME_ORDER fino a cui mostrare; -1 = tutte.
  const [fameDepth, setFameDepth] = useState(-1);

  // Tutti i motivi presenti nei dati (per i chip di filtro).
  const allMotifs = useMemo(() => {
    const s = new Set<string>();
    for (const t of traps) for (const m of t.motif) s.add(m);
    return Array.from(s).sort();
  }, [traps]);

  const toggleMotif = (m: string) =>
    setMotifs((prev) => {
      const next = new Set(prev);
      if (next.has(m)) next.delete(m);
      else next.add(m);
      return next;
    });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return traps.filter((t) => {
      if (category !== "all" && t.category !== category) return false;
      if (side !== "all" && t.side !== side) return false;
      if (fameDepth >= 0 && FAME_ORDER.indexOf(t.fame) > fameDepth) return false;
      if (motifs.size > 0 && !t.motif.some((m) => motifs.has(m))) return false;
      if (q) {
        const hay = `${t.name} ${t.opening_name ?? ""} ${t.eco_code ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [traps, search, category, side, motifs, fameDepth]);

  return (
    <div className="space-y-6">
      {/* Ricerca testuale */}
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder='Search by name or opening (e.g. "Sicilian", "Légal", "B10")…'
        aria-label="Search trap"
      />

      {/* Filtri */}
      <div className="space-y-3">
        <FilterRow label="Category">
          {CATEGORIES.map((c) => (
            <Chip key={c} active={category === c} onClick={() => setCategory(c)}>
              {c === "all" ? "All" : CATEGORY_LABEL[c]}
            </Chip>
          ))}
        </FilterRow>

        <FilterRow label="Side (who sets it)">
          {(["all", "white", "black"] as SideFilter[]).map((s) => (
            <Chip key={s} active={side === s} onClick={() => setSide(s)}>
              {s === "all" ? "All" : SIDE_LABEL[s]}
            </Chip>
          ))}
        </FilterRow>

        <FilterRow label="Notoriety">
          <Chip active={fameDepth === -1} onClick={() => setFameDepth(-1)}>
            All
          </Chip>
          {FAME_ORDER.map((f, i) => (
            <Chip key={f} active={fameDepth === i} onClick={() => setFameDepth(i)}>
              {i === 0 ? FAME_LABEL[f] : `+ ${FAME_LABEL[f]}`}
            </Chip>
          ))}
        </FilterRow>

        {allMotifs.length > 0 && (
          <FilterRow label="Tactical motif">
            {allMotifs.map((m) => (
              <Chip key={m} active={motifs.has(m)} onClick={() => toggleMotif(m)}>
                {motifLabel(m)}
              </Chip>
            ))}
          </FilterRow>
        )}
      </div>

      {/* Risultati */}
      <p className="text-sm text-text-muted">
        {filtered.length === 0
          ? "No traps match these filters."
          : `${filtered.length} ${filtered.length === 1 ? "trap" : "traps"}`}
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {filtered.map((t) => (
          <TrapCard key={t.id} trap={t} />
        ))}
      </div>
    </div>
  );
}

function TrapCard({ trap }: { trap: TrapSummary }) {
  return (
    <Link href={`/app/trappole/${trap.slug}`} className="group">
      <Card className="h-full transition-colors group-hover:border-text">
        <CardContent className="space-y-3 py-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-display text-lg font-semibold leading-tight">{trap.name}</h3>
            <Badge variant="muted">{SIDE_LABEL[trap.side]}</Badge>
          </div>

          {(trap.opening_name || trap.eco_code) && (
            <p className="font-mono text-xs text-text-muted">
              {trap.eco_code ? `${trap.eco_code} · ` : ""}
              {trap.opening_name ?? ""}
            </p>
          )}

          <div className="flex flex-wrap gap-1.5">
            <Badge>{CATEGORY_LABEL[trap.category]}</Badge>
            {trap.motif.slice(0, 3).map((m) => (
              <Badge key={m} variant="muted">
                {motifLabel(m)}
              </Badge>
            ))}
          </div>

          <p className="text-xs text-text-muted">
            {FAME_LABEL[trap.fame]} · level{" "}
            <span className="font-mono text-text">{trap.level}</span>
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-full text-xs uppercase tracking-wide text-text-muted sm:w-40">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-sm transition-colors",
        active
          ? "border-text bg-text text-bg"
          : "border-border text-text-muted hover:border-text hover:text-text",
      )}
    >
      {children}
    </button>
  );
}
