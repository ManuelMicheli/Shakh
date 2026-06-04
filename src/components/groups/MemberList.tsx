"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { updateMemberRole, removeMember } from "@/app/app/gruppi/actions";
import { GROUP_ROLE_LABEL, type GroupRole, type MemberRow } from "@/lib/groups/types";

export interface MemberListProps {
  groupId: string;
  members: MemberRow[];
  /** L'utente corrente è owner del gruppo (può gestire i ruoli)? */
  isOwner: boolean;
  /** L'utente corrente è istruttore/owner (può aprire il drill-down)? */
  canDrill: boolean;
}

export function MemberList({ groupId, members, isOwner, canDrill }: MemberListProps) {
  const t = useTranslations("groups");
  const router = useRouter();
  const { toast } = useToast();
  const [pending, start] = useTransition();

  const onRole = (userId: string, role: GroupRole) => {
    start(async () => {
      const res = await updateMemberRole(groupId, userId, role);
      if (!res.ok) {
        toast({ title: t("toastNotUpdated"), description: res.error, variant: "error" });
        return;
      }
      router.refresh();
    });
  };

  const onRemove = (userId: string) => {
    start(async () => {
      const res = await removeMember(groupId, userId);
      if (!res.ok) {
        toast({ title: t("toastNotRemoved"), description: res.error, variant: "error" });
        return;
      }
      router.refresh();
    });
  };

  return (
    <ul className="divide-y divide-border">
      {members.map((m) => (
        <li key={m.userId} className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate font-medium">{m.displayName}</p>
              <Badge variant="muted">{GROUP_ROLE_LABEL[m.role]}</Badge>
            </div>
            {m.username && <p className="text-xs text-text-muted">@{m.username}</p>}
          </div>
          <div className="flex items-center gap-2">
            {canDrill && m.role !== "owner" && (
              <Link
                href={`/app/gruppi/${groupId}/allievi/${m.userId}`}
                className="inline-flex h-8 items-center rounded-md border border-border bg-surface-2 px-3 text-sm font-medium text-text hover:bg-surface"
              >
                {t("progressLink")}
              </Link>
            )}
            {isOwner && m.role !== "owner" && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    onRole(m.userId, m.role === "instructor" ? "member" : "instructor")
                  }
                >
                  {m.role === "instructor" ? t("makeStudentButton") : t("promoteInstructorButton")}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() => onRemove(m.userId)}
                >
                  {t("removeButton")}
                </Button>
              </>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
