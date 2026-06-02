/**
 * Tipi del layer istruttore / circolo (prompt 09).
 * Solo relazioni + viste aggregate: nessuna logica di prodotto nuova.
 */

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

export const GROUP_TYPE_LABEL: Record<GroupType, string> = {
  circolo: "Circolo",
  classe: "Classe",
  scuola: "Scuola",
};

export const GROUP_ROLE_LABEL: Record<GroupRole, string> = {
  member: "Allievo",
  instructor: "Istruttore",
  owner: "Proprietario",
};

export const REF_TYPE_LABEL: Record<AssignmentRefType, string> = {
  lesson: "Lezione",
  puzzle_set: "Set di puzzle",
  endgame: "Finale",
  trap: "Trappola",
  repertoire: "Repertorio",
  path_node: "Nodo del percorso",
};

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
