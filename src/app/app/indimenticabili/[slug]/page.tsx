import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { FamousGameViewer } from "@/components/games/FamousGameViewer";
import { FAMOUS_GAMES, findFamousGame } from "@/lib/games/famous";

export function generateStaticParams() {
  return FAMOUS_GAMES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const game = findFamousGame(slug);
  const t = await getTranslations("metadata");
  return { title: game ? `${game.title} — Shakh` : t("famousGames") };
}

export default async function FamousGamePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const game = findFamousGame(slug);
  if (!game) notFound();

  const t = await getTranslations("famous");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          {game.title}
        </h1>
        <Link
          href="/app/indimenticabili"
          className="text-sm text-text-muted hover:text-text"
        >
          ← {t("list.title")}
        </Link>
      </div>
      <FamousGameViewer game={game} />
    </div>
  );
}
