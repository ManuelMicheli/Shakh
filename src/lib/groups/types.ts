/**
 * Tipi del layer istruttore / circolo (prompt 09).
 * Solo relazioni + viste aggregate: nessuna logica di prodotto nuova.
 */

import type { Locale } from "@/i18n/config";

export type GroupRole = "member" | "instructor" | "owner";
export type GroupType = "circolo" | "classe" | "scuola";

/** Risorse assegnabili (colonna generalizzata assignments.ref_type). */
export type AssignmentRefType =
  | "lesson"
  | "puzzle_set"
  | "endgame"
  | "trap"
  | "repertoire"
  | "path_node";

export type AssignmentStatus = "assigned" | "in_progress" | "completed" | "skipped";

// I record `*_LABEL` restano in inglese per i consumatori esistenti; gli
// accessor `*Label(key, locale)` forniscono la variante localizzata.

export const GROUP_TYPE_LABEL: Record<GroupType, string> = {
  circolo: "Club",
  classe: "Class",
  scuola: "School",
};

const GROUP_TYPE_LABEL_IT: Record<GroupType, string> = {
  circolo: "Circolo",
  classe: "Classe",
  scuola: "Scuola",
};

export function groupTypeLabel(type: GroupType, locale: Locale): string {
  return (locale === "it" ? GROUP_TYPE_LABEL_IT : GROUP_TYPE_LABEL)[type];
}

export const GROUP_ROLE_LABEL: Record<GroupRole, string> = {
  member: "Student",
  instructor: "Instructor",
  owner: "Owner",
};

const GROUP_ROLE_LABEL_IT: Record<GroupRole, string> = {
  member: "Allievo",
  instructor: "Istruttore",
  owner: "Proprietario",
};

export function groupRoleLabel(role: GroupRole, locale: Locale): string {
  return (locale === "it" ? GROUP_ROLE_LABEL_IT : GROUP_ROLE_LABEL)[role];
}

export const REF_TYPE_LABEL: Record<AssignmentRefType, string> = {
  lesson: "Lesson",
  puzzle_set: "Puzzle set",
  endgame: "Endgame",
  trap: "Trap",
  repertoire: "Repertoire",
  path_node: "Path node",
};

const REF_TYPE_LABEL_IT: Record<AssignmentRefType, string> = {
  lesson: "Lezione",
  puzzle_set: "Set di puzzle",
  endgame: "Finale",
  trap: "Trappola",
  repertoire: "Repertorio",
  path_node: "Nodo del percorso",
};

export function refTypeLabel(ref: AssignmentRefType, locale: Locale): string {
  return (locale === "it" ? REF_TYPE_LABEL_IT : REF_TYPE_LABEL)[ref];
}

/** Parametri opzionali di un'assegnazione (es. set di puzzle per tema). */
export interface AssignmentParams {
  theme?: string;
  count?: number;
  minSuccessRate?: number;
  /** Chiave del finale (dimensione user_progress 'endgame'), es. 'kq_vs_k'. */
  key?: string;
}

export interface GroupSummary {
  id: string;
  name: string;
  slug: string;
  type: GroupType;
  role: GroupRole;
  memberCount: number;
}

export interface MemberRow {
  userId: string;
  displayName: string;
  username: string | null;
  role: GroupRole;
  joinedAt: string;
}

export interface InviteRow {
  id: string;
  code: string;
  email: string | null;
  roleInGroup: GroupRole;
  expiresAt: string | null;
  usedBy: string | null;
  usedAt: string | null;
  createdAt: string;
}
