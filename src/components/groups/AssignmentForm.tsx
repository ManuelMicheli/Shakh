"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { createAssignment } from "@/app/app/gruppi/actions";
import { TACTIC_THEMES } from "@/lib/tactics/themes";
import { REF_TYPE_LABEL, type AssignmentRefType, type AssignmentParams } from "@/lib/groups/types";

export interface AssignmentFormData {
  members: { userId: string; name: string }[];
  lessons: { id: string; title: string }[];
  traps: { id: string; name: string }[];
  repertoires: { id: string; name: string }[];
  pathNodes: { id: string; title: string }[];
}

const ENDGAMES: { key: string; labelKey: string }[] = [
  { key: "kq_vs_k", labelKey: "endgameKqVsK" },
  { key: "kp_vs_k", labelKey: "endgameKpVsK" },
  { key: "q_vs_p", labelKey: "endgameQVsP" },
  { key: "lucena", labelKey: "endgameLucena" },
  { key: "philidor", labelKey: "endgamePhilidor" },
];

const SELECT_CLS =
  "h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-text focus-visible:outline-2 focus-visible:outline-offset-2";

export function AssignmentForm({ groupId, data }: { groupId: string; data: AssignmentFormData }) {
  const t = useTranslations("groups");
  const router = useRouter();
  const { toast } = useToast();
  const [pending, start] = useTransition();

  const [targetType, setTargetType] = useState<"group" | "user">("group");
  const [targetUserId, setTargetUserId] = useState("");
  const [refType, setRefType] = useState<AssignmentRefType>("lesson");
  const [refId, setRefId] = useState("");
  const [theme, setTheme] = useState(TACTIC_THEMES[0].key);
  const [count, setCount] = useState("15");
  const [endgame, setEndgame] = useState(ENDGAMES[0].key);
  const [note, setNote] = useState("");
  const [due, setDue] = useState("");

  // Resetta la risorsa quando cambia il tipo.
  const onRefType = (t: AssignmentRefType) => {
    setRefType(t);
    setRefId("");
  };

  const buildPayload = (): { refId: string | null; params: AssignmentParams | null } | string => {
    switch (refType) {
      case "lesson":
        if (!refId) return t("errChooseLesson");
        return { refId, params: null };
      case "puzzle_set":
        return { refId: null, params: { theme, count: Math.max(1, Number(count) || 10) } };
      case "endgame":
        return { refId: null, params: { key: endgame } };
      case "trap":
        if (!refId) return t("errChooseTrap");
        return { refId, params: null };
      case "repertoire":
        if (!refId) return t("errChooseRepertoire");
        return { refId, params: null };
      case "path_node":
        if (!refId) return t("errChoosePathNode");
        return { refId, params: null };
      default:
        return t("errInvalidType");
    }
  };

  const onSubmit = () => {
    if (targetType === "user" && !targetUserId) {
      toast({ title: t("errChooseStudentShort"), variant: "error" });
      return;
    }
    const payload = buildPayload();
    if (typeof payload === "string") {
      toast({ title: payload, variant: "error" });
      return;
    }
    start(async () => {
      const res = await createAssignment({
        groupId,
        targetType,
        targetUserId: targetType === "user" ? targetUserId : null,
        refType,
        refId: payload.refId,
        params: payload.params,
        note: note || null,
        dueAt: due ? new Date(due).toISOString() : null,
      });
      if (!res.ok) {
        toast({ title: t("toastNotAssigned"), description: res.error, variant: "error" });
        return;
      }
      setNote("");
      setDue("");
      toast({ title: t("toastAssignmentCreated") });
      router.refresh();
    });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Destinatario */}
        <div className="space-y-1.5">
          <span className="text-xs text-text-muted">{t("recipientLabel")}</span>
          <select
            className={SELECT_CLS}
            value={targetType}
            onChange={(e) => setTargetType(e.target.value as "group" | "user")}
          >
            <option value="group">{t("recipientWholeClass")}</option>
            <option value="user">{t("recipientAStudent")}</option>
          </select>
        </div>
        {targetType === "user" && (
          <div className="space-y-1.5">
            <span className="text-xs text-text-muted">{t("studentLabel")}</span>
            <select
              className={SELECT_CLS}
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
            >
              <option value="">{t("chooseOption")}</option>
              {data.members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Tipo di attività */}
        <div className="space-y-1.5">
          <span className="text-xs text-text-muted">{t("activityTypeLabel")}</span>
          <select
            className={SELECT_CLS}
            value={refType}
            onChange={(e) => onRefType(e.target.value as AssignmentRefType)}
          >
            {(Object.keys(REF_TYPE_LABEL) as AssignmentRefType[]).map((t) => (
              <option key={t} value={t}>
                {REF_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </div>

        {/* Risorsa specifica per tipo */}
        <div className="space-y-1.5">
          {refType === "lesson" && (
            <>
              <span className="text-xs text-text-muted">{t("lessonLabel")}</span>
              <select
                className={SELECT_CLS}
                value={refId}
                onChange={(e) => setRefId(e.target.value)}
              >
                <option value="">{t("chooseOption")}</option>
                {data.lessons.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.title}
                  </option>
                ))}
              </select>
            </>
          )}
          {refType === "puzzle_set" && (
            <>
              <span className="text-xs text-text-muted">{t("puzzleThemeLabel")}</span>
              <select
                className={SELECT_CLS}
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
              >
                {TACTIC_THEMES.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.label}
                  </option>
                ))}
              </select>
            </>
          )}
          {refType === "endgame" && (
            <>
              <span className="text-xs text-text-muted">{t("endgameLabel")}</span>
              <select
                className={SELECT_CLS}
                value={endgame}
                onChange={(e) => setEndgame(e.target.value)}
              >
                {ENDGAMES.map((e) => (
                  <option key={e.key} value={e.key}>
                    {t(e.labelKey)}
                  </option>
                ))}
              </select>
            </>
          )}
          {refType === "trap" && (
            <>
              <span className="text-xs text-text-muted">{t("trapLabel")}</span>
              <select
                className={SELECT_CLS}
                value={refId}
                onChange={(e) => setRefId(e.target.value)}
              >
                <option value="">{t("chooseOption")}</option>
                {data.traps.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </>
          )}
          {refType === "repertoire" && (
            <>
              <span className="text-xs text-text-muted">{t("groupRepertoireLabel")}</span>
              <select
                className={SELECT_CLS}
                value={refId}
                onChange={(e) => setRefId(e.target.value)}
              >
                <option value="">{t("chooseOption")}</option>
                {data.repertoires.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </>
          )}
          {refType === "path_node" && (
            <>
              <span className="text-xs text-text-muted">{t("pathNodeLabel")}</span>
              <select
                className={SELECT_CLS}
                value={refId}
                onChange={(e) => setRefId(e.target.value)}
              >
                <option value="">{t("chooseOption")}</option>
                {data.pathNodes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.title}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>
      </div>

      {refType === "puzzle_set" && (
        <div className="w-32 space-y-1.5">
          <label className="text-xs text-text-muted" htmlFor="puzzle-count">
            {t("howManyPuzzlesLabel")}
          </label>
          <Input
            id="puzzle-count"
            type="number"
            min="1"
            value={count}
            onChange={(e) => setCount(e.target.value)}
          />
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-xs text-text-muted" htmlFor="assign-note">
            {t("noteOptionalLabel")}
          </label>
          <Input
            id="assign-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("notePlaceholder")}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-text-muted" htmlFor="assign-due">
            {t("dueDateOptionalLabel")}
          </label>
          <Input
            id="assign-due"
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? t("assigningPending") : t("assignButton")}
        </Button>
      </div>
    </form>
  );
}
