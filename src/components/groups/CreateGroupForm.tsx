"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { createGroup } from "@/app/app/gruppi/actions";
import { GROUP_TYPE_LABEL, type GroupType } from "@/lib/groups/types";

const TYPES: GroupType[] = ["circolo", "classe", "scuola"];

export function CreateGroupForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [type, setType] = useState<GroupType>("circolo");
  const [pending, start] = useTransition();

  const onCreate = () => {
    start(async () => {
      const res = await createGroup(name, type);
      if (!res.ok || !res.data) {
        toast({ title: "Non creato", description: res.error, variant: "error" });
        return;
      }
      setName("");
      router.push(`/app/gruppi/${res.data.id}`);
    });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onCreate();
      }}
      className="flex flex-wrap items-end gap-3"
    >
          <div className="min-w-[14rem] flex-1 space-y-1">
            <label className="text-xs text-text-muted" htmlFor="group-name">
              Nome
            </label>
            <Input
              id="group-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="es. Circolo Scacchi Milano"
            />
          </div>
          <div className="space-y-1">
            <span className="block text-xs text-text-muted">Tipo</span>
            <div className="inline-flex rounded-md border border-border bg-surface p-0.5">
              {TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={
                    "rounded px-3 py-1.5 text-sm transition-colors " +
                    (type === t ? "bg-text text-bg" : "text-text-muted hover:text-text")
                  }
                >
                  {GROUP_TYPE_LABEL[t]}
                </button>
              ))}
            </div>
          </div>
          <Button type="submit" disabled={pending || !name.trim()}>
            Crea gruppo
          </Button>
    </form>
  );
}
