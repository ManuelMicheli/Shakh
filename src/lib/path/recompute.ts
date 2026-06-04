/**
 * Ricalcolo idempotente dello stato del percorso per un utente (prompt 07).
 *
 * Legge i nodi published e i progressi dei moduli (via requirements.ts),
 * deriva lo stato di ogni nodo e aggiorna `user_path_progress` +
 * `profiles.current_level`. Idempotente: rieseguibile a piacere; il
 * completamento è "appiccicoso" (un nodo completato non torna indietro,
 * né per calo di rating né per uno skip d'onboarding di chi è già forte).
 *
 * Modulo NON "use server": riceve un client Supabase già autenticato.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { activeLocale, pickLocale } from "@/lib/i18n/content";
import { evaluateNode } from "./requirements";
import type { PathActivity, PathNodeRow, PathNodeStatus, PathNodeView } from "./types";

type DB = SupabaseClient;

// Si leggono le colonne bilingui (0021) per title/description/activities; il
// resto della riga è invariato.
const NODE_COLS =
  "id, level, slug, title_it, title_en, description_it, description_en, order_index, prerequisites, requirements, activities_it, activities_en, published";

// Forma grezza dal DB con le colonne localizzate, prima della risoluzione.
type PathNodeDbRow = Omit<PathNodeRow, "title" | "description" | "activities"> & {
  title_it: string | null;
  title_en: string | null;
  description_it: string | null;
  description_en: string | null;
  activities_it: PathActivity[] | null;
  activities_en: PathActivity[] | null;
};

/** Carica i nodi published ordinati per livello/ordine. */
export async function loadNodes(supabase: DB): Promise<PathNodeRow[]> {
  const locale = await activeLocale();
  const { data } = await supabase
    .from("path_nodes")
    .select(NODE_COLS)
    .eq("published", true)
    .order("level", { ascending: true })
    .order("order_index", { ascending: true });
  // Risolve title/description/activities alla lingua attiva, mantenendo la forma di PathNodeRow.
  return ((data as PathNodeDbRow[] | null) ?? []).map((r) => {
    const {
      title_it,
      title_en,
      description_it,
      description_en,
      activities_it,
      activities_en,
      ...rest
    } = r;
    return {
      ...rest,
      title: pickLocale(title_it, title_en, locale) ?? "",
      description: pickLocale(description_it, description_en, locale),
      activities: pickLocale(activities_it, activities_en, locale) ?? [],
    };
  });
}

/** Primo livello (in ordine crescente) non interamente completato; +1 se tutti completi. */
function deriveCurrentLevel(nodes: PathNodeRow[], completedIds: Set<string>): number {
  const levels = Array.from(new Set(nodes.map((n) => n.level))).sort((a, b) => a - b);
  for (const level of levels) {
    const ofLevel = nodes.filter((n) => n.level === level);
    const allDone = ofLevel.every((n) => completedIds.has(n.id));
    if (!allDone) return level;
  }
  return levels.length ? levels[levels.length - 1] + 1 : 0;
}

/**
 * Ricalcola e persiste lo stato di tutti i nodi per l'utente.
 * Ritorna le viste (nodo + stato + progress) per la UI e il livello corrente.
 */
export async function recomputePath(
  supabase: DB,
  userId: string,
): Promise<{ nodes: PathNodeView[]; currentLevel: number }> {
  const nodes = await loadNodes(supabase);
  if (nodes.length === 0) return { nodes: [], currentLevel: 0 };

  // Stato precedente (per la stickiness del completamento).
  const { data: prevRows } = await supabase
    .from("user_path_progress")
    .select("node_id, status, completed_at")
    .eq("user_id", userId);
  const prev = new Map<string, { status: PathNodeStatus; completed_at: string | null }>();
  for (const r of prevRows ?? [])
    prev.set(r.node_id as string, { status: r.status, completed_at: r.completed_at });

  // 1) Valuta ogni nodo (completamento dipende solo dai propri requisiti + stickiness).
  const evals = await Promise.all(
    nodes.map((n) => evaluateNode(supabase, userId, n.requirements)),
  );

  const completedIds = new Set<string>();
  const computed = nodes.map((n, i) => {
    const e = evals[i];
    const wasCompleted = prev.get(n.id)?.status === "completed";
    const completed = e.completed || wasCompleted;
    if (completed) completedIds.add(n.id);
    return { node: n, progress: completed ? 1 : e.progress, completed };
  });

  const slugById = new Map(nodes.map((n) => [n.slug, n.id]));

  // 2) Stato finale: completed | available/in_progress (prereq completati) | locked.
  const now = new Date().toISOString();
  const views: PathNodeView[] = [];
  const upserts: Array<{
    user_id: string;
    node_id: string;
    status: PathNodeStatus;
    progress: number;
    completed_at: string | null;
  }> = [];

  for (const c of computed) {
    const prereqsMet = c.node.prerequisites.every((slug) => {
      const id = slugById.get(slug);
      return id ? completedIds.has(id) : false;
    });

    let status: PathNodeStatus;
    if (c.completed) status = "completed";
    else if (!prereqsMet) status = "locked";
    else status = c.progress > 0 ? "in_progress" : "available";

    const completedAt =
      status === "completed"
        ? prev.get(c.node.id)?.completed_at ?? now
        : null;

    views.push({ ...c.node, status, progress: c.progress });
    upserts.push({
      user_id: userId,
      node_id: c.node.id,
      status,
      progress: c.progress,
      completed_at: completedAt,
    });
  }

  await supabase
    .from("user_path_progress")
    .upsert(upserts, { onConflict: "user_id,node_id" });

  const currentLevel = deriveCurrentLevel(nodes, completedIds);
  await supabase.from("profiles").update({ current_level: currentLevel }).eq("id", userId);

  return { nodes: views, currentLevel };
}
