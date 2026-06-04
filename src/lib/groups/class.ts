/**
 * Dashboard di classe (prompt 09 §4): VISTA AGGREGATA del core.
 *
 * Riusa integralmente le aggregazioni dell'08 (`loadDashboard`) applicate ai
 * membri del gruppo. Nessuna nuova logica di calcolo dei progressi: qui si
 * combinano i risultati per-allievo in metriche di classe.
 *
 * Ogni lettura passa dalla RLS: l'istruttore vede solo gli allievi dei propri
 * gruppi (is_group_instructor_of).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { loadDashboard, type AreaKey, type AreaCompetence } from "@/lib/progress/aggregate";
import type { GroupRole } from "./types";
import type { Locale } from "@/i18n/config";

type DB = SupabaseClient;

export interface StudentSummary {
  userId: string;
  name: string;
  username: string | null;
  role: GroupRole;
  tacticRating: number | null;
  level: number;
  accuracy: number | null;
  lastActivity: string | null;
  /** Etichette dei punti deboli prioritari dell'allievo. */
  weaknesses: { label: string; area: AreaKey; score: number }[];
  competence: AreaCompetence[];
}

export interface CommonWeakness {
  label: string;
  area: AreaKey;
  /** Quanti allievi hanno questo punto debole. */
  count: number;
  avgScore: number;
}

export interface ClassAreaCompetence {
  area: AreaKey;
  label: string;
  avgScore: number | null;
  studentsWithData: number;
}

export interface ClassData {
  students: StudentSummary[];
  commonWeaknesses: CommonWeakness[];
  competenceByArea: ClassAreaCompetence[];
}

interface MemberRecord {
  user_id: string;
  role_in_group: GroupRole;
  profiles: { display_name: string | null; username: string | null } | null;
}

/** Elenco dei membri del gruppo con ruolo e nome (via RLS dell'istruttore). */
export async function loadMembers(
  supabase: DB,
  groupId: string,
  locale: Locale = "en",
): Promise<{ userId: string; name: string; username: string | null; role: GroupRole }[]> {
  const fallback = locale === "it" ? "Allievo" : "Student";
  const { data } = await supabase
    .from("group_members")
    .select("user_id, role_in_group, profiles(display_name, username)")
    .eq("group_id", groupId)
    .order("joined_at", { ascending: true });
  const rows = (data as MemberRecord[] | null) ?? [];
  return rows.map((m) => ({
    userId: m.user_id,
    name: m.profiles?.display_name ?? m.profiles?.username ?? fallback,
    username: m.profiles?.username ?? null,
    role: m.role_in_group,
  }));
}

/**
 * Dati aggregati di classe: per ogni allievo carica la dashboard dell'08 e
 * combina i risultati (punti deboli comuni, competenza media per area).
 */
export async function loadClassData(
  supabase: DB,
  groupId: string,
  locale: Locale = "en",
): Promise<ClassData> {
  const members = await loadMembers(supabase, groupId, locale);

  const students: StudentSummary[] = await Promise.all(
    members.map(async (m) => {
      const dash = await loadDashboard(supabase, m.userId, locale);
      return {
        userId: m.userId,
        name: m.name,
        username: m.username,
        role: m.role,
        tacticRating: dash.tactic.rating,
        level: dash.path.currentLevel,
        accuracy: dash.game.accuracy,
        lastActivity: dash.recent[0]?.at ?? null,
        weaknesses: dash.weaknesses.map((w) => ({ label: w.label, area: w.area, score: w.score })),
        competence: dash.competence,
      };
    }),
  );

  // Punti deboli COMUNI: stessa etichetta in più allievi.
  const wMap = new Map<string, { area: AreaKey; count: number; sum: number }>();
  for (const s of students) {
    for (const w of s.weaknesses) {
      const cur = wMap.get(w.label) ?? { area: w.area, count: 0, sum: 0 };
      cur.count += 1;
      cur.sum += w.score;
      wMap.set(w.label, cur);
    }
  }
  const commonWeaknesses: CommonWeakness[] = [...wMap.entries()]
    .map(([label, v]) => ({ label, area: v.area, count: v.count, avgScore: v.sum / v.count }))
    .sort((a, b) => b.count - a.count || a.avgScore - b.avgScore);

  // Competenza media per area fra gli allievi con dati.
  const it = locale === "it";
  const AREAS: { area: AreaKey; label: string }[] = [
    { area: "tattica", label: it ? "Tattica" : "Tactics" },
    { area: "aperture", label: it ? "Aperture" : "Openings" },
    { area: "mediogioco", label: it ? "Mediogioco" : "Middlegame" },
    { area: "finali", label: it ? "Finali" : "Endgames" },
    { area: "trappole", label: it ? "Trappole" : "Traps" },
  ];
  const competenceByArea: ClassAreaCompetence[] = AREAS.map(({ area, label }) => {
    const scores = students
      .map((s) => s.competence.find((c) => c.area === area)?.score)
      .filter((v): v is number => v != null);
    return {
      area,
      label,
      avgScore: scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null,
      studentsWithData: scores.length,
    };
  });

  return { students, commonWeaknesses, competenceByArea };
}
