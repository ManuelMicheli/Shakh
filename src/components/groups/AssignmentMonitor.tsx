"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { deleteAssignment } from "@/app/app/gruppi/actions";

export interface MonitorItem {
  id: string;
  label: string;
  typeLabel: string;
  targetType: "user" | "group";
  note: string | null;
  dueAt: string | null;
  total: number;
  completed: number;
  inProgress: number;
}

/** Monitoraggio assegnazioni con completamento derivato (prompt 09 §5). */
export function AssignmentMonitor({ groupId, items }: { groupId: string; items: MonitorItem[] }) {
  const t = useTranslations("groups");
  const router = useRouter();
  const { toast } = useToast();
  const [pending, start] = useTransition();

  const dueLabel = (iso: string | null): string | null => {
    if (!iso) return null;
    const d = new Date(iso);
    return t("dueDate", { date: `${d.getMonth() + 1}/${d.getDate()}` });
  };

  const onDelete = (id: string) => {
    start(async () => {
      const res = await deleteAssignment(groupId, id);
      if (!res.ok) {
        toast({ title: t("toastNotDeleted"), description: res.error, variant: "error" });
        return;
      }
      router.refresh();
    });
  };

  if (items.length === 0) {
    return <p className="text-sm text-text-muted">{t("noActiveAssignments")}</p>;
  }

  return (
    <ul className="divide-y divide-border">
      {items.map((a) => {
        const due = dueLabel(a.dueAt);
        return (
          <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-muted">{a.typeLabel}</span>
                <Badge variant="muted">
                  {a.targetType === "group" ? t("targetClass") : t("targetIndividual")}
                </Badge>
              </div>
              <p className="truncate font-medium">{a.label}</p>
              <p className="text-xs text-text-muted">
                {t("completedCount", { completed: a.completed, total: a.total })}
                {a.inProgress > 0 ? ` · ${t("inProgressCount", { count: a.inProgress })}` : ""}
                {a.note ? ` · ${a.note}` : ""}
                {due ? ` · ${due}` : ""}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => onDelete(a.id)}
            >
              {t("deleteButton")}
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
