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
        toast({ title: "Join non riuscito", description: res.error, variant: "error" });
        return;
      }
      toast({ title: "Sei entrato nel gruppo" });
      router.push(`/app/gruppi/${res.data.groupId}`);
    });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-muted">
        Entrando nel gruppo, l&apos;istruttore potrà vedere i tuoi progressi (in sola lettura)
        per aiutarti a migliorare. Puoi lasciare il gruppo in qualunque momento.
      </p>
      <div className="flex gap-2">
        <Button onClick={onAccept} disabled={pending}>
          {pending ? "Ingresso…" : "Accetto ed entro"}
        </Button>
        <Button variant="ghost" onClick={() => router.push("/app/gruppi")} disabled={pending}>
          Annulla
        </Button>
      </div>
    </div>
  );
}
