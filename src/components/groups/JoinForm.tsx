"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { joinByCode } from "@/app/app/gruppi/actions";

/** Unisciti a un gruppo incollando il codice d'invito. */
export function JoinForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [pending, start] = useTransition();

  const onJoin = () => {
    start(async () => {
      const res = await joinByCode(code);
      if (!res.ok || !res.data) {
        toast({ title: "Join non riuscito", description: res.error, variant: "error" });
        return;
      }
      setCode("");
      toast({ title: "Sei entrato nel gruppo" });
      router.push(`/app/gruppi/${res.data.groupId}`);
    });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onJoin();
      }}
      className="flex flex-wrap items-end gap-3"
    >
      <div className="min-w-[12rem] flex-1 space-y-1">
        <label className="text-xs text-text-muted" htmlFor="join-code">
          Codice d&apos;invito
        </label>
        <Input
          id="join-code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="es. K7P2M9QX"
          className="font-mono"
        />
      </div>
      <Button type="submit" variant="secondary" disabled={pending || !code.trim()}>
        Unisciti
      </Button>
    </form>
  );
}
