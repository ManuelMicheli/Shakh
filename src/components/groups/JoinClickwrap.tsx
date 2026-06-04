"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { joinByCode } from "@/app/app/gruppi/actions";

/** Clickwrap di ingresso in un gruppo: l'allievo accetta esplicitamente. */
export function JoinClickwrap({ code }: { code: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, start] = useTransition();

  const onAccept = () => {
    start(async () => {
      const res = await joinByCode(code);
      if (!res.ok || !res.data) {
        toast({ title: "Join failed", description: res.error, variant: "error" });
        return;
      }
      toast({ title: "You joined the group" });
      router.push(`/app/gruppi/${res.data.groupId}`);
    });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-muted">
        By joining the group, the instructor will be able to see your progress (read-only)
        to help you improve. You can leave the group at any time.
      </p>
      <div className="flex gap-2">
        <Button onClick={onAccept} disabled={pending}>
          {pending ? "Joining…" : "Accept and join"}
        </Button>
        <Button variant="ghost" onClick={() => router.push("/app/gruppi")} disabled={pending}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
