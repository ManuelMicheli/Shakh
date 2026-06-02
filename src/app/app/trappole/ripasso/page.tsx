import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TrapReview, type ReviewItem } from "@/components/traps/TrapReview";
import { listDueTraps, bodyAsLesson } from "@/lib/traps/query";
import type { TrapMode } from "@/lib/traps/types";

export const metadata = {
  title: "Ripasso trappole · Shakh",
};

export default async function TrapReviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const due = user ? await listDueTraps(supabase, user.id) : [];

  // Alterna le due modalità: "evita" (la più preziosa) sui pari, "tendi" sui dispari.
  const items: ReviewItem[] = due
    .map((t, i) => {
      const lesson = bodyAsLesson(t.body);
      if (!lesson) return null;
      const mode: TrapMode = i % 2 === 0 ? "evita" : "tendi";
      return {
        trapId: t.id,
        slug: t.slug,
        name: t.name,
        side: t.side,
        triggerFen: t.trigger_fen,
        tree: lesson.tree,
        mode,
      };
    })
    .filter((x): x is ReviewItem => x !== null);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Ripasso trappole</h1>
        <Link href="/app/trappole" className="text-sm text-text-muted hover:text-text">
          ← Trappole
        </Link>
      </div>
      <TrapReview items={items} />
    </div>
  );
}
