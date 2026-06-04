/**
 * Assegnazioni generalizzate (prompt 09 §5).
 *
 * Il COMPLETAMENTO è DERIVATO dai progressi reali riusando l'engine dei
 * requisiti del 07 (`evaluateRequirement`) dove possibile; dove non è
 * derivabile (es. repertorio), l'allievo può marcarla fatta a mano
 * (assignment_progress.manual). Nessuna duplicazione di logica di progresso.
 *
 * Sola lettura su un client Supabase già autenticato: la RLS garantisce che
 * l'istruttore veda solo i dati degli allievi dei propri gruppi.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { evaluateRequirement } from "@/lib/path/requirements";
import type { Requirement } from "@/lib/path/types";
import { themeLabel } from "@/lib/tactics/themes";
import {
  REF_TYPE_LABEL,
  type AssignmentRefType,
  type AssignmentParams,
  type AssignmentStatus,
} from "./types";

type DB = SupabaseClient;

/** Slug delle lezioni-finale per costruire l'href verso il modulo Teoria. */
const ENDGAME_SLUG: Record<string, string> = {
  kq_vs_k: "matti-elementari",
  kp_vs_k: "re-e-pedone-contro-re",
  q_vs_p: "donna-contro-pedone",
  lucena: "posizione-di-lucena",
  philidor: "posizione-di-philidor",
};

const ENDGAME_LABEL: Record<string, string> = {
  kq_vs_k: "King+Queen vs King",
  kp_vs_k: "King and pawn vs King",
  q_vs_p: "Queen vs pawn",
  lucena: "Lucena position",
  philidor: "Philidor position",
};

export interface AssignmentRow {
  id: string;
  assigned_by: string | null;
  target_type: "user" | "group";
  target_user_id: string | null;
  target_group_id: string | null;
  ref_type: AssignmentRefType | null;
  ref_id: string | null;
  params: AssignmentParams | null;
  note: string | null;
  due_at: string | null;
  created_at: string;
}

export interface AssignmentView {
  id: string;
  refType: AssignmentRefType | null;
  refId: string | null;
  params: AssignmentParams | null;
  /** Etichetta leggibile della risorsa assegnata. */
  label: string;
  /** Tipo leggibile (Lezione, Set di puzzle, …). */
  typeLabel: string;
  /** Link al modulo giusto per svolgere l'attività. */
  href: string;
  note: string | null;
  dueAt: string | null;
  targetType: "user" | "group";
}

/** Mappa un'assegnazione a un Requirement del 07 (se derivabile). */
function toRequirement(
  refType: AssignmentRefType | null,
  params: AssignmentParams | null,
): Requirement | null {
  switch (refType) {
    case "puzzle_set":
      if (!params?.theme) return null;
      return {
        type: "puzzles_theme",
        theme: params.theme,
        count: params.count ?? 10,
        minSuccessRate: params.minSuccessRate ?? 0.6,
      };
    case "endgame":
      if (!params?.key) return null;
      return { type: "endgame_practice", key: params.key };
    default:
      return null;
  }
}

/**
 * Deriva lo stato di un'assegnazione per un utente leggendo i progressi reali.
 * `manualDone` (da assignment_progress) ha precedenza assoluta.
 */
export async function deriveAssignmentStatus(
  supabase: DB,
  userId: string,
  a: AssignmentRow,
  manualDone: boolean,
): Promise<{ status: AssignmentStatus; progress: number; derivable: boolean }> {
  if (manualDone) return { status: "completed", progress: 1, derivable: false };

  // Tipi mappabili sull'engine dei requisiti del 07.
  const req = toRequirement(a.ref_type, a.params);
  if (req) {
    const r = await evaluateRequirement(supabase, userId, req);
    return {
      status: r.met ? "completed" : r.progress > 0 ? "in_progress" : "assigned",
      progress: r.progress,
      derivable: true,
    };
  }

  // Lezione: completata se esiste la riga content_completions.
  if (a.ref_type === "lesson" && a.ref_id) {
    const { data } = await supabase
      .from("content_completions")
      .select("content_item_id")
      .eq("user_id", userId)
      .eq("content_item_id", a.ref_id)
      .maybeSingle();
    const met = Boolean(data);
    return { status: met ? "completed" : "assigned", progress: met ? 1 : 0, derivable: true };
  }

  // Nodo del percorso: completato se lo stato del nodo è 'completed'.
  if (a.ref_type === "path_node" && a.ref_id) {
    const { data } = await supabase
      .from("user_path_progress")
      .select("status, progress")
      .eq("user_id", userId)
      .eq("node_id", a.ref_id)
      .maybeSingle<{ status: string; progress: number }>();
    const met = data?.status === "completed";
    return {
      status: met ? "completed" : (data?.progress ?? 0) > 0 ? "in_progress" : "assigned",
      progress: data?.progress ?? 0,
      derivable: true,
    };
  }

  // Trappola: convertita con successo almeno una volta.
  if (a.ref_type === "trap" && a.ref_id) {
    const { data } = await supabase
      .from("user_trap_progress")
      .select("attempts, successes")
      .eq("user_id", userId)
      .eq("trap_id", a.ref_id)
      .maybeSingle<{ attempts: number; successes: number }>();
    const met = (data?.successes ?? 0) >= 1;
    return {
      status: met ? "completed" : (data?.attempts ?? 0) > 0 ? "in_progress" : "assigned",
      progress: met ? 1 : (data?.attempts ?? 0) > 0 ? 0.4 : 0,
      derivable: true,
    };
  }

  // Repertorio (o altro non derivabile): solo completamento manuale.
  return { status: "assigned", progress: 0, derivable: false };
}

/** Costruisce etichetta + href della risorsa assegnata (risolve gli slug). */
export async function enrichAssignment(supabase: DB, a: AssignmentRow): Promise<AssignmentView> {
  const typeLabel = a.ref_type ? REF_TYPE_LABEL[a.ref_type] : "Activity";
  let label = typeLabel;
  let href = "/app";

  switch (a.ref_type) {
    case "lesson": {
      if (a.ref_id) {
        const { data } = await supabase
          .from("content_items")
          .select("title, slug")
          .eq("id", a.ref_id)
          .maybeSingle<{ title: string; slug: string }>();
        label = data?.title ?? "Lesson";
        href = data ? `/app/teoria/${data.slug}` : "/app/teoria";
      }
      break;
    }
    case "puzzle_set": {
      const theme = a.params?.theme;
      const count = a.params?.count ?? 10;
      label = theme ? `Puzzles: ${themeLabel(theme)} ×${count}` : "Puzzle set";
      href = "/app/tattiche";
      break;
    }
    case "endgame": {
      const key = a.params?.key ?? "";
      label = ENDGAME_LABEL[key] ?? "Endgame";
      href = `/app/teoria/${ENDGAME_SLUG[key] ?? "matti-elementari"}`;
      break;
    }
    case "trap": {
      if (a.ref_id) {
        const { data } = await supabase
          .from("traps")
          .select("name, slug")
          .eq("id", a.ref_id)
          .maybeSingle<{ name: string; slug: string }>();
        label = data?.name ?? "Trap";
        href = data ? `/app/trappole/${data.slug}` : "/app/trappole";
      }
      break;
    }
    case "repertoire": {
      if (a.ref_id) {
        const { data } = await supabase
          .from("repertoires")
          .select("name")
          .eq("id", a.ref_id)
          .maybeSingle<{ name: string }>();
        label = data?.name ? `Repertoire: ${data.name}` : "Repertoire";
        href = `/app/repertorio/${a.ref_id}/training`;
      }
      break;
    }
    case "path_node": {
      if (a.ref_id) {
        const { data } = await supabase
          .from("path_nodes")
          .select("title")
          .eq("id", a.ref_id)
          .maybeSingle<{ title: string }>();
        label = data?.title ? `Path: ${data.title}` : "Path node";
        href = "/app/percorso";
      }
      break;
    }
    default:
      break;
  }

  return {
    id: a.id,
    refType: a.ref_type,
    refId: a.ref_id,
    params: a.params,
    label,
    typeLabel,
    href,
    note: a.note,
    dueAt: a.due_at,
    targetType: a.target_type,
  };
}

export interface StudentAssignment extends AssignmentView {
  status: AssignmentStatus;
  progress: number;
  derivable: boolean;
}

const SELECT_COLS =
  "id, assigned_by, target_type, target_user_id, target_group_id, ref_type, ref_id, params, note, due_at, created_at";

/**
 * Assegnazioni rivolte all'allievo: dirette (target_user) o ai gruppi di cui
 * è membro (target_group). La RLS le rende già visibili; qui si arricchiscono
 * e si deriva lo stato per ciascuna.
 */
export async function loadStudentAssignments(
  supabase: DB,
  userId: string,
): Promise<StudentAssignment[]> {
  // Gruppi dell'utente per filtrare le assegnazioni di classe.
  const { data: memberships } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("user_id", userId);
  const groupIds = (memberships as { group_id: string }[] | null)?.map((m) => m.group_id) ?? [];

  const orParts = [`target_user_id.eq.${userId}`];
  if (groupIds.length > 0) orParts.push(`target_group_id.in.(${groupIds.join(",")})`);

  const { data } = await supabase
    .from("assignments")
    .select(SELECT_COLS)
    .or(orParts.join(","))
    .order("created_at", { ascending: false });
  const rows = (data as AssignmentRow[] | null) ?? [];

  // Stato manuale dell'allievo.
  const { data: progRows } = await supabase
    .from("assignment_progress")
    .select("assignment_id, manual, status")
    .eq("user_id", userId);
  const manualMap = new Map(
    ((progRows as { assignment_id: string; manual: boolean; status: string }[] | null) ?? []).map(
      (p) => [p.assignment_id, p.manual && p.status === "completed"],
    ),
  );

  return Promise.all(
    rows.map(async (a) => {
      const view = await enrichAssignment(supabase, a);
      const st = await deriveAssignmentStatus(supabase, userId, a, manualMap.get(a.id) ?? false);
      return { ...view, ...st };
    }),
  );
}

export interface GroupAssignmentMonitor extends AssignmentView {
  createdAt: string;
  /** Conteggio per stato fra gli allievi destinatari. */
  total: number;
  completed: number;
  inProgress: number;
}

/**
 * Assegnazioni di un gruppo viste dall'istruttore, con conteggio del
 * completamento fra i destinatari (derivato dai progressi reali via RLS).
 */
export async function loadGroupAssignments(
  supabase: DB,
  groupId: string,
  memberIds: string[],
): Promise<GroupAssignmentMonitor[]> {
  const { data } = await supabase
    .from("assignments")
    .select(SELECT_COLS)
    .or(`target_group_id.eq.${groupId},target_user_id.in.(${memberIds.join(",") || "00000000-0000-0000-0000-000000000000"})`)
    .order("created_at", { ascending: false });
  const rows = (data as AssignmentRow[] | null) ?? [];

  // Mappa manuale (assignment_id,user_id) → completata a mano.
  const { data: progRows } = await supabase
    .from("assignment_progress")
    .select("assignment_id, user_id, manual, status")
    .in("user_id", memberIds.length ? memberIds : ["00000000-0000-0000-0000-000000000000"]);
  const manualSet = new Set(
    ((progRows as { assignment_id: string; user_id: string; manual: boolean; status: string }[] | null) ?? [])
      .filter((p) => p.manual && p.status === "completed")
      .map((p) => `${p.assignment_id}:${p.user_id}`),
  );

  return Promise.all(
    rows.map(async (a) => {
      const view = await enrichAssignment(supabase, a);
      const targets =
        a.target_type === "group"
          ? memberIds
          : a.target_user_id
            ? [a.target_user_id]
            : [];
      let completed = 0;
      let inProgress = 0;
      await Promise.all(
        targets.map(async (uid) => {
          const st = await deriveAssignmentStatus(
            supabase,
            uid,
            a,
            manualSet.has(`${a.id}:${uid}`),
          );
          if (st.status === "completed") completed++;
          else if (st.status === "in_progress") inProgress++;
        }),
      );
      return { ...view, createdAt: a.created_at, total: targets.length, completed, inProgress };
    }),
  );
}
