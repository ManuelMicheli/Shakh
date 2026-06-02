"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { markAssignmentDone } from "@/app/app/gruppi/actions";
import type { StudentAssignment } from "@/lib/groups/assignments";
import type { AssignmentStatus } from "@/lib/groups/types";

const STATUS_LABEL: Record<AssignmentStatus, string> = {
  assigned: "Da fare",
  in_progress: "In corso",
  completed: "Completata",
  skipped: "Saltata",
};

function dueLabel(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return `entro il ${d.getDate()}/${d.getMonth() + 1}`;
}

/** Sezione "Assegnato dal tuo istruttore" nella dashboard dell'allievo (09 §5). */
export function StudentAssignments({ items }: { items: StudentAssignment[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, start] = useTransition();

  const onToggle = (id: string, done: boolean) => {
    start(async () => {
      const res = await markAssignmentDone(id, done);
      if (!res.ok) {
        toast({ title: "Non aggiornato", description: res.error, variant: "error" });
        return;
      }
      router.refresh();
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assegnato dal tuo istruttore</CardTitle>
        <CardDescription>Attività da svolgere, con scadenze e stato.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-y divide-border">
          {items.map((a) => {
            const due = dueLabel(a.dueAt);
            const completed = a.status === "completed";
            return (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-muted">{a.typeLabel}</span>
                    <Badge variant={completed ? "muted" : undefined}>
                      {STATUS_LABEL[a.status]}
                    </Badge>
                  </div>
                  <p className="truncate font-medium">{a.label}</p>
                  {(a.note || due) && (
                    <p className="text-xs text-text-muted">
                      {a.note}
                      {a.note && due ? " · " : ""}
                      {due}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={a.href}
                    className="inline-flex h-8 items-center rounded-md border border-border bg-surface-2 px-3 text-sm font-medium text-text hover:bg-surface"
                  >
                    Vai
                  </Link>
                  {/* Le attività non derivabili dall'engine si segnano a mano. */}
                  {!a.derivable && (
                    <Button
                      variant={completed ? "ghost" : "secondary"}
                      size="sm"
                      disabled={pending}
                      onClick={() => onToggle(a.id, !completed)}
                    >
                      {completed ? "Annulla" : "Segna fatta"}
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
