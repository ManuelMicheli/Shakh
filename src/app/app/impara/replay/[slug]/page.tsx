import { notFound } from "next/navigation";
import Link from "next/link";
import { GuidedReplay } from "@/components/learn/GuidedReplay";
import { findGuided } from "@/lib/learn/guided";

export const metadata = { title: "Partita spiegata — Impara — Shakh" };

export default async function ReplayPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const game = findGuided(slug);
  if (!game) notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold tracking-tight">{game.title}</h1>
        <Link href="/app/impara" className="text-sm text-text-muted hover:text-text">
          ← Impara
        </Link>
      </div>
      <GuidedReplay
        title={game.title}
        intro={game.intro}
        pgn={game.pgn}
        comments={game.comments}
      />
    </div>
  );
}
