import { notFound } from "next/navigation";
import Link from "next/link";
import { ConceptRunner } from "@/components/learn/ConceptRunner";
import { findConcept } from "@/lib/learn/concepts";
import { getLadderPuzzles } from "../../actions";

export const metadata = { title: "Concept — Learn — Shakh" };

export default async function ConceptPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const concept = findConcept(slug);
  if (!concept) notFound();

  const puzzles = await getLadderPuzzles(concept.theme);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold tracking-tight">{concept.title}</h1>
        <Link href="/app/impara" className="text-sm text-text-muted hover:text-text">
          ← Learn
        </Link>
      </div>
      <ConceptRunner
        slug={concept.slug}
        title={concept.title}
        intro={concept.intro}
        goal={concept.goal}
        puzzles={puzzles}
      />
    </div>
  );
}
