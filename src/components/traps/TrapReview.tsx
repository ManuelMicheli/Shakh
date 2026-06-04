"use client";

import { useState } from "react";
import Link from "next/link";
import { TrapTrainer } from "@/components/traps/TrapTrainer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SerializedMoveTree } from "@/lib/chess/moveTree";
import type { TrapMode, TrapSide } from "@/lib/traps/types";

export interface ReviewItem {
  trapId: string;
  slug: string;
  name: string;
  side: TrapSide;
  triggerFen: string;
  tree: SerializedMoveTree;
  mode: TrapMode;
}

/**
 * Sessione di "ripasso trappole": serve in sequenza le trappole in scadenza
 * (SRS). Ogni risultato è già registrato dal trainer (fromReview); qui si
 * coordina solo l'avanzamento e un breve riepilogo finale.
 */
export function TrapReview({ items }: { items: ReviewItem[] }) {
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState({ ok: 0, ko: 0 });

  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Review complete</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-text-muted">No traps due. Check back later.</p>
          <Link href="/app/trappole">
            <Button variant="secondary">Trap catalog</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (index >= items.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Review complete</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-text-muted">
            Reviewed <span className="font-mono text-text">{items.length}</span> traps · ✓{" "}
            {score.ok} · ✗ {score.ko}
          </p>
          <div className="flex gap-2">
            <Link href="/app/trappole/ripasso">
              <Button onClick={() => window.location.reload()}>Continue reviewing</Button>
            </Link>
            <Link href="/app/trappole">
              <Button variant="secondary">Catalog</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  const item = items[index];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge>{index + 1} / {items.length}</Badge>
          <span className="font-mono text-sm text-text-muted">
            {item.mode === "tendi" ? "Set" : "Avoid"} · {item.name}
          </span>
        </div>
        <span className="font-mono text-sm text-text-muted">
          ✓ {score.ok} · ✗ {score.ko}
        </span>
      </div>

      <TrapTrainer
        key={`${item.trapId}-${item.mode}-${index}`}
        trapId={item.trapId}
        slug={item.slug}
        name={item.name}
        side={item.side}
        triggerFen={item.triggerFen}
        tree={item.tree}
        mode={item.mode}
        fromReview
        onComplete={(success) =>
          setScore((s) => ({
            ok: s.ok + (success ? 1 : 0),
            ko: s.ko + (success ? 0 : 1),
          }))
        }
      />

      <div className="flex justify-end">
        <Button variant="secondary" size="sm" onClick={() => setIndex((i) => i + 1)}>
          {index + 1 >= items.length ? "Finish" : "Next trap →"}
        </Button>
      </div>
    </div>
  );
}
