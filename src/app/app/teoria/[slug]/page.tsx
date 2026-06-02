import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LessonViewer } from "@/components/theory/LessonViewer";
import { isLesson, type ContentItemRow } from "@/lib/theory/types";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  // RLS: lettura pubblica solo dei contenuti published.
  const { data } = await supabase
    .from("content_items")
    .select("id, type, parent_id, eco_code, title, slug, summary, body, start_fen, line_pgn, level, order_index, published")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle<ContentItemRow>();

  if (!data) notFound();
  if (!isLesson(data.body)) {
    // Contenuto pubblicato ma senza lezione strutturata.
    return (
      <div className="mx-auto max-w-2xl py-12 text-center">
        <h1 className="font-display text-2xl font-semibold">{data.title}</h1>
        <p className="mt-2 text-text-muted">Questa lezione non è ancora disponibile.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <LessonViewer
        lesson={data.body}
        type={data.type}
        title={data.title}
        coachConfigured={Boolean(process.env.ANTHROPIC_API_KEY)}
      />
    </div>
  );
}
