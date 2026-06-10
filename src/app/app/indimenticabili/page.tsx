import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { FAMOUS_GAMES } from "@/lib/games/famous";

export async function generateMetadata() {
  const t = await getTranslations("metadata");
  return { title: t("famousGames") };
}

export default async function FamousGamesPage() {
  const t = await getTranslations("famous");

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          {t("list.title")}
        </h1>
        <p className="text-sm text-text-muted">{t("list.subtitle")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {FAMOUS_GAMES.map((game) => (
          <Link
            key={game.slug}
            href={`/app/indimenticabili/${game.slug}`}
            className="group"
          >
            <Card className="h-full transition-colors group-hover:border-text/40">
              <CardContent className="flex h-full flex-col gap-2 py-4">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono text-xs text-text-muted">
                    {game.year}
                  </span>
                  <Badge variant="outline" className="font-mono">
                    {game.result}
                  </Badge>
                </div>
                <p className="font-display text-lg font-medium leading-snug">
                  {game.title}
                </p>
                <p className="text-sm text-text-muted">
                  {game.white} – {game.black}
                </p>
                <p className="text-sm text-text-muted">{game.event}</p>
                <p className="mt-auto pt-2 text-sm leading-relaxed">
                  {game.highlight}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
