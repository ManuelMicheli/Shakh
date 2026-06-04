import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ConceptRunner } from "@/components/learn/ConceptRunner";
import { findConcept } from "@/lib/learn/concepts";
import { getLadderPuzzles } from "../../actions";

export async function generateMetadata() {
  const t = await getTranslations("metadata");
  return { title: t("concept") };
}

export default async function ConceptPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const concept = findConcept(slug);
  if (!concept) notFound();

  const t = await getTranslations("theory");
  const puzzles = await getLadderPuzzles(concept.theme);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold tracking-tight">{concept.title}</h1>
        <Link href="/app/impara" className="text-sm text-text-muted hover:text-text">
          ← {t("learn.title")}
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
