"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CONCEPTS } from "@/lib/learn/concepts";
import { GUIDED_GAMES } from "@/lib/learn/guided";
import { MobilePageHeader } from "@/components/layout/MobilePageHeader";

const STORE_KEY = "shakh:learn:concepts";

export default function ImparaPage() {
  const [done, setDone] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const arr = JSON.parse(localStorage.getItem(STORE_KEY) ?? "[]") as string[];
      setDone(new Set(arr));
    } catch {
      /* ignora */
    }
  }, []);

  const completed = CONCEPTS.filter((c) => done.has(c.slug)).length;

  return (
    <div className="space-y-8">
      <MobilePageHeader
        eyebrow="Un concetto alla volta"
        title="Impara"
        desc="Capisci l'idea, riconoscila, sfruttala. Poi partite spiegate."
        piece="pawn"
      />
      <div className="hidden md:block">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Impara</h1>
        <p className="mt-2 max-w-2xl text-text-muted">
          I fondamentali, un concetto alla volta. Prima capisci l&apos;idea, poi la riconosci
          e la sfrutti in piccoli esercizi. Poi guarda partite spiegate mossa per mossa.
        </p>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">Concetti</h2>
          <span className="font-mono text-sm text-text-muted">
            {completed}/{CONCEPTS.length}
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {CONCEPTS.map((c) => (
            <Link key={c.slug} href={`/app/impara/concetto/${c.slug}`} className="group">
              <Card className="h-full transition-colors group-hover:border-text">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg">{c.title}</CardTitle>
                    {done.has(c.slug) && <Badge>fatto</Badge>}
                  </div>
                  <CardDescription className="line-clamp-2">{c.intro}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold">Partite spiegate</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {GUIDED_GAMES.map((g) => (
            <Link key={g.slug} href={`/app/impara/replay/${g.slug}`} className="group">
              <Card className="h-full transition-colors group-hover:border-text">
                <CardHeader>
                  <CardTitle className="text-lg">{g.title}</CardTitle>
                  <CardDescription className="line-clamp-2">{g.intro}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
