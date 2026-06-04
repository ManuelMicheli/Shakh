"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { joinByCode } from "@/app/app/gruppi/actions";

/** Clickwrap di ingresso in un gruppo: l'allievo accetta esplicitamente. */
export function JoinClickwrap({ code }: { code: string }) {
  const t = useTranslations("groups");
  const router = useRouter();
  const { toast } = useToast();
  const [pending, start] = useTransition();

  const onAccept = () => {
    start(async () => {
      const res = await joinByCode(code);
      if (!res.ok || !res.data) {
        toast({ title: t("toastJoinFailed"), description: res.error, variant: "error" });
        return;
      }
      toast({ title: t("toastJoinedGroup") });
      router.push(`/app/gruppi/${res.data.groupId}`);
    });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-muted">
        {t("clickwrapNotice")}
      </p>
      <div className="flex gap-2">
        <Button onClick={onAccept} disabled={pending}>
          {pending ? t("joiningPending") : t("acceptAndJoinButton")}
        </Button>
        <Button variant="ghost" onClick={() => router.push("/app/gruppi")} disabled={pending}>
          {t("cancelButton")}
        </Button>
      </div>
    </div>
  );
}
