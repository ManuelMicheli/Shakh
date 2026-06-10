"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { ChevronRight, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

export interface OpeningNode {
  id: string;
  parentId: string | null;
  slug: string;
  title: string;
  eco: string | null;
  summary: string | null;
  hasLesson: boolean;
}

export interface OpeningTreeProps {
  nodes: OpeningNode[];
}

// Tetto dei risultati di ricerca renderizzati (il catalogo ECO ha ~3.700 voci).
const MAX_RESULTS = 200;

/** Albero ECO espandibile: famiglia → apertura → variante. SAN/ECO in monospace. */
export function OpeningTree({ nodes }: OpeningTreeProps) {
  const t = useTranslations("theory");
  const [query, setQuery] = useState("");
  const { roots, childrenOf } = useMemo(() => {
    const ids = new Set(nodes.map((n) => n.id));
    const childrenOf = new Map<string | null, OpeningNode[]>();
    for (const n of nodes) {
      // Nodi il cui genitore non è tra i pubblicati diventano radici.
      const key = n.parentId && ids.has(n.parentId) ? n.parentId : null;
      const list = childrenOf.get(key) ?? [];
      list.push(n);
      childrenOf.set(key, list);
    }
    return { roots: childrenOf.get(null) ?? [], childrenOf };
  }, [nodes]);

  // Ricerca piatta su titolo + ECO: con migliaia di voci l'albero da solo non basta.
  const q = query.trim().toLowerCase();
  const matches = useMemo(() => {
    if (q.length < 2) return null;
    return nodes.filter(
      (n) => n.title.toLowerCase().includes(q) || (n.eco ?? "").toLowerCase().includes(q),
    );
  }, [nodes, q]);

  if (nodes.length === 0) {
    return (
      <p className="text-sm text-text-muted">
        {t("openingTree.empty")}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("openingTree.searchPlaceholder")}
        className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none placeholder:text-text-muted focus:border-text-muted"
      />
      {matches ? (
        matches.length === 0 ? (
          <p className="text-sm text-text-muted">{t("openingTree.noResults")}</p>
        ) : (
          <>
            {matches.length > MAX_RESULTS && (
              <p className="text-xs text-text-muted">
                {t("openingTree.resultsCapped", { count: MAX_RESULTS })}
              </p>
            )}
            <ul className="space-y-1">
              {matches.slice(0, MAX_RESULTS).map((n) => (
                <TreeRow key={n.id} node={n} childrenOf={new Map()} depth={0} />
              ))}
            </ul>
          </>
        )
      ) : (
        <ul className="space-y-1">
          {roots.map((n) => (
            <TreeRow key={n.id} node={n} childrenOf={childrenOf} depth={0} />
          ))}
        </ul>
      )}
    </div>
  );
}

function TreeRow({
  node,
  childrenOf,
  depth,
}: {
  node: OpeningNode;
  childrenOf: Map<string | null, OpeningNode[]>;
  depth: number;
}) {
  const t = useTranslations("theory");
  const children = childrenOf.get(node.id) ?? [];
  const [open, setOpen] = useState(depth === 0);
  const hasChildren = children.length > 0;

  return (
    <li>
      <div
        className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-surface-2"
        style={{ paddingLeft: `${depth * 1.25 + 0.5}rem` }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? t("openingTree.collapse") : t("openingTree.expand")}
            className="text-text-muted"
          >
            <ChevronRight className={cn("h-4 w-4 transition-transform", open && "rotate-90")} />
          </button>
        ) : (
          <span className="w-4" />
        )}

        {node.eco && (
          <span className="min-w-[2.5rem] font-mono text-xs text-text-muted">{node.eco}</span>
        )}

        {node.hasLesson ? (
          <Link
            href={`/app/teoria/${node.slug}`}
            className="flex items-center gap-1.5 font-medium hover:underline"
          >
            <BookOpen className="h-3.5 w-3.5 text-text-muted" />
            {node.title}
          </Link>
        ) : (
          <span className="font-medium">{node.title}</span>
        )}

        {node.summary && (
          <span className="truncate text-sm text-text-muted">— {node.summary}</span>
        )}
      </div>

      {hasChildren && open && (
        <ul className="space-y-1">
          {children.map((c) => (
            <TreeRow key={c.id} node={c} childrenOf={childrenOf} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}
