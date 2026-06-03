"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMyGroupRole, isInstructorRole } from "@/lib/groups/access";
import { loadClassData } from "@/lib/groups/class";
import { synthesizeClass } from "@/lib/ai/coach";
import type { CoachSynthesis } from "@/lib/ai/types";
import type {
  GroupRole,
  GroupType,
  AssignmentRefType,
  AssignmentParams,
} from "@/lib/groups/types";
import type { PieceColor } from "@/lib/theory/repertoire";

export interface ActionResult<T = undefined> {
  ok: boolean;
  data?: T;
  error?: string;
}

const AUTH_ERR = "Sessione scaduta. Accedi di nuovo.";
const PERM_ERR = "Non hai i permessi per questa azione.";

/** Slug url-friendly con suffisso casuale per garantire l'unicità. */
function makeSlug(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFD")
    // rimuove i segni diacritici combinanti (U+0300–U+036F)
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const suffix = randomBytes(3).toString("hex");
  return `${base || "gruppo"}-${suffix}`;
}

/** Codice d'invito non indovinabile (base32, ~50 bit). */
function makeInviteCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(10);
  let out = "";
  for (let i = 0; i < bytes.length; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

// ─────────────────────────────── Gruppi ──────────────────────────────────────

/** Crea un gruppo: l'utente ne diventa owner (abilita le funzioni istruttore). */
export async function createGroup(
  name: string,
  type: GroupType,
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: AUTH_ERR };

  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Dai un nome al gruppo." };

  const { data: group, error } = await supabase
    .from("groups")
    .insert({ name: trimmed, slug: makeSlug(trimmed), type, owner_id: user.id })
    .select("id")
    .single<{ id: string }>();
  if (error) return { ok: false, error: error.message };

  // L'owner è anche membro con ruolo 'owner'.
  const { error: memErr } = await supabase
    .from("group_members")
    .insert({ group_id: group.id, user_id: user.id, role_in_group: "owner" });
  if (memErr) return { ok: false, error: memErr.message };

  revalidatePath("/app/gruppi");
  return { ok: true, data: { id: group.id } };
}

// ─────────────────────────────── Inviti ──────────────────────────────────────

export async function createInvite(
  groupId: string,
  opts: { role: GroupRole; expiresInDays: number | null; email: string | null },
): Promise<ActionResult<{ code: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: AUTH_ERR };

  const role = await getMyGroupRole(supabase, groupId, user.id);
  if (!isInstructorRole(role)) return { ok: false, error: PERM_ERR };

  const code = makeInviteCode();
  const expires_at =
    opts.expiresInDays && opts.expiresInDays > 0
      ? new Date(Date.now() + opts.expiresInDays * 86_400_000).toISOString()
      : null;

  const { error } = await supabase.from("group_invites").insert({
    group_id: groupId,
    code,
    email: opts.email?.trim() || null,
    role_in_group: opts.role,
    expires_at,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/app/gruppi/${groupId}`);
  return { ok: true, data: { code } };
}

export async function revokeInvite(groupId: string, inviteId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: AUTH_ERR };

  const role = await getMyGroupRole(supabase, groupId, user.id);
  if (!isInstructorRole(role)) return { ok: false, error: PERM_ERR };

  // Scope esplicito al gruppo (oltre alla RLS): evita revoche cross-gruppo.
  const { error } = await supabase
    .from("group_invites")
    .delete()
    .eq("id", inviteId)
    .eq("group_id", groupId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/app/gruppi/${groupId}`);
  return { ok: true };
}

/** Join via codice (clickwrap): l'allievo accetta di entrare nel gruppo. */
export async function joinByCode(code: string): Promise<ActionResult<{ groupId: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: AUTH_ERR };

  const { data, error } = await supabase.rpc("join_group_by_code", {
    invite_code: code.trim(),
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/app/gruppi");
  return { ok: true, data: { groupId: data as string } };
}

// ─────────────────────────────── Membri ──────────────────────────────────────

export async function updateMemberRole(
  groupId: string,
  userId: string,
  role: GroupRole,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: AUTH_ERR };

  // Solo l'owner gestisce i ruoli (coerente con la policy group_members_owner_write).
  const myRole = await getMyGroupRole(supabase, groupId, user.id);
  if (myRole !== "owner") return { ok: false, error: PERM_ERR };
  if (role === "owner") return { ok: false, error: "Il ruolo owner non è assegnabile qui." };

  const { error } = await supabase
    .from("group_members")
    .update({ role_in_group: role })
    .eq("group_id", groupId)
    .eq("user_id", userId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/app/gruppi/${groupId}`);
  return { ok: true };
}

export async function removeMember(groupId: string, userId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: AUTH_ERR };

  const myRole = await getMyGroupRole(supabase, groupId, user.id);
  if (myRole !== "owner") return { ok: false, error: PERM_ERR };
  if (userId === user.id) return { ok: false, error: "Non puoi rimuovere te stesso (owner)." };

  const { error } = await supabase
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", userId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/app/gruppi/${groupId}`);
  return { ok: true };
}

// ─────────────────────────── Repertorio di gruppo ─────────────────────────────

/** Crea un repertorio di GRUPPO (riusa l'editor del 06b). */
export async function createGroupRepertoire(
  groupId: string,
  name: string,
  color: PieceColor,
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: AUTH_ERR };

  const role = await getMyGroupRole(supabase, groupId, user.id);
  if (!isInstructorRole(role)) return { ok: false, error: PERM_ERR };

  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Dai un nome al repertorio." };

  // RLS repertoires_write consente l'insert di gruppo agli istruttori/owner.
  const { data, error } = await supabase
    .from("repertoires")
    .insert({ owner_group_id: groupId, name: trimmed, color })
    .select("id")
    .single<{ id: string }>();
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/app/gruppi/${groupId}`);
  return { ok: true, data: { id: data.id } };
}

// ─────────────────────────────── Assegnazioni ────────────────────────────────

export interface CreateAssignmentInput {
  groupId: string;
  targetType: "user" | "group";
  targetUserId: string | null;
  refType: AssignmentRefType;
  refId: string | null;
  params: AssignmentParams | null;
  note: string | null;
  dueAt: string | null;
}

export async function createAssignment(input: CreateAssignmentInput): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: AUTH_ERR };

  const role = await getMyGroupRole(supabase, input.groupId, user.id);
  if (!isInstructorRole(role)) return { ok: false, error: PERM_ERR };

  if (input.targetType === "user") {
    if (!input.targetUserId) return { ok: false, error: "Scegli un allievo." };
    // L'allievo deve far parte del gruppo: la RLS su assignments controlla solo
    // assigned_by, non il target, quindi senza questo check un istruttore
    // potrebbe assegnare a un utente qualsiasi della piattaforma.
    const targetRole = await getMyGroupRole(supabase, input.groupId, input.targetUserId);
    if (!targetRole) return { ok: false, error: "L'allievo non fa parte di questo gruppo." };
  }

  const { error } = await supabase.from("assignments").insert({
    assigned_by: user.id,
    target_type: input.targetType,
    target_user_id: input.targetType === "user" ? input.targetUserId : null,
    target_group_id: input.targetType === "group" ? input.groupId : null,
    ref_type: input.refType,
    ref_id: input.refId,
    params: input.params,
    note: input.note?.trim() || null,
    due_at: input.dueAt,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/app/gruppi/${input.groupId}/assegnazioni`);
  return { ok: true };
}

export async function deleteAssignment(
  groupId: string,
  assignmentId: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  // RLS: solo l'autore (assigned_by) può eliminare.
  const { error } = await supabase.from("assignments").delete().eq("id", assignmentId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/app/gruppi/${groupId}/assegnazioni`);
  return { ok: true };
}

/** Lato allievo: segna un'assegnazione come fatta (per le attività non derivabili). */
export async function markAssignmentDone(
  assignmentId: string,
  done: boolean,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: AUTH_ERR };

  const { error } = await supabase.from("assignment_progress").upsert(
    {
      assignment_id: assignmentId,
      user_id: user.id,
      manual: done,
      status: done ? "completed" : "assigned",
      completed_at: done ? new Date().toISOString() : null,
    },
    { onConflict: "assignment_id,user_id" },
  );
  if (error) return { ok: false, error: error.message };

  revalidatePath("/app");
  return { ok: true };
}

// ─────────────────────────── Riassunto di classe (coach) ──────────────────────

/** Sintesi di classe via Funzione C (prompt 09 §7). Solo istruttore. */
export async function refreshClassSynthesis(
  groupId: string,
): Promise<ActionResult<{ synthesis: CoachSynthesis }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: AUTH_ERR };

  const role = await getMyGroupRole(supabase, groupId, user.id);
  if (!isInstructorRole(role)) return { ok: false, error: PERM_ERR };

  const data = await loadClassData(supabase, groupId);
  if (data.students.length === 0)
    return { ok: false, error: "Nessun allievo nel gruppo." };

  const synthesis = await synthesizeClass({
    studentCount: data.students.length,
    areas: data.competenceByArea.map((a) => ({
      label: a.label,
      avgScore: a.avgScore,
      studentsWithData: a.studentsWithData,
    })),
    commonWeaknesses: data.commonWeaknesses
      .filter((w) => w.count >= 2)
      .map((w) => ({ label: w.label, count: w.count })),
  });
  if (!synthesis) return { ok: false, error: "Sintesi non disponibile, riprova." };

  return { ok: true, data: { synthesis } };
}
