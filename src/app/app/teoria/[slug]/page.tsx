import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { activeLocale, pickLocale } from "@/lib/i18n/content";
import { LessonViewer } from "@/components/theory/LessonViewer";
import { EndgamePractice } from "@/components/theory/EndgamePractice";
import { PositionalExercise } from "@/components/theory/PositionalExercise";
import { isLesson, type ContentItemRow } from "@/lib/theory/types";
import { hasPractice } from "@/lib/theory/endgame";
import { hasExercise } from "@/lib/theory/middlegame";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const locale = await activeLocale();
  const t = await getTranslations("theory");

  // RLS: lettura pubblica solo dei contenuti published. Si leggono le colonne
  // bilingui (0021/0022) per title/summary/body; `body` (italiano) è il fallback
  // quando manca `body_en`.
  const { data: raw } = await supabase
    .from("content_items")
    .select("id, type, parent_id, eco_code, title_it, title_en, slug, summary_it, summary_en, body, body_en, start_fen, line_pgn, level, order_index, published")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle<
      Omit<ContentItemRow, "title" | "summary"> & {
        title_it: string | null;
        title_en: string | null;
        summary_it: string | null;
        summary_en: string | null;
        body_en: ContentItemRow["body"] | null;
      }
    >();

  if (!raw) notFound();

  // Risolve title/summary/body alla lingua attiva, riportando la forma di ContentItemRow.
  const { body_en, ...rest } = raw;
  const data: ContentItemRow = {
    ...rest,
    title: pickLocale(raw.title_it, raw.title_en, locale) ?? "",
    summary: pickLocale(raw.summary_it, raw.summary_en, locale),
    body: pickLocale(raw.body, body_en, locale) ?? raw.body,
  };
  if (!isLesson(data.body)) {
    // Contenuto pubblicato ma senza lezione strutturata.
    return (
      <div className="mx-auto max-w-2xl py-12 text-center">
        <h1 className="font-display text-2xl font-semibold">{data.title}</h1>
        <p className="mt-2 text-text-muted">{t("lesson.notAvailable")}</p>
      </div>
    );
  }

  // Blocchi interattivi specifici del ramo (06c): pratica del finale contro la
  // tablebase, esercizio posizionale del mediogioco. Il `body` resta una `Lesson`
  // valida per il viewer; questi campi extra sono opzionali e additivi.
  const practice = data.type === "endgame" && hasPractice(data.body) ? data.body.practice : null;
  const exercise = data.type === "middlegame" && hasExercise(data.body) ? data.body.exercise : null;

  return (
    <div className="space-y-8">
      <LessonViewer
        lesson={data.body}
        type={data.type}
        title={data.title}
        coachConfigured={Boolean(process.env.ANTHROPIC_API_KEY)}
        contentItemId={data.id}
      />

      {practice && <EndgamePractice practice={practice} />}
      {exercise && <PositionalExercise exercise={exercise} />}
    </div>
  );
}
