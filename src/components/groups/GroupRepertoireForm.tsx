"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { createGroupRepertoire } from "@/app/app/gruppi/actions";
import type { PieceColor } from "@/lib/theory/repertoire";

/** Crea un repertorio di gruppo e apre l'editor del 06b. */
export function GroupRepertoireForm({ groupId }: { groupId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [color, setColor] = useState<PieceColor>("white");
  const [pending, start] = useTransition();

  const onCreate = () => {
    start(async () => {
      const res = await createGroupRepertoire(groupId, name, color);
      if (!res.ok || !res.data) {
        toast({ title: "Non creato", description: res.error, variant: "error" });
        return;
      }
      setName("");
      router.push(`/app/repertorio/${res.data.id}`);
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
      <div className="min-w-[12rem] flex-1 space-y-1">
        <label className="text-xs text-text-muted" htmlFor="grep-name">
          Nome
        </label>
        <Input
          id="grep-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="es. Italiana del circolo"
        />
      </div>
      <div className="space-y-1">
        <span className="block text-xs text-text-muted">Colore</span>
        <div className="inline-flex rounded-md border border-border bg-surface p-0.5">
          {(["white", "black"] as PieceColor[]).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={
                "rounded px-3 py-1.5 text-sm transition-colors " +
                (color === c ? "bg-text text-bg" : "text-text-muted hover:text-text")
              }
            >
              {c === "white" ? "Bianco" : "Nero"}
            </button>
          ))}
        </div>
      </div>
      <Button type="submit" disabled={pending || !name.trim()}>
        Crea repertorio di gruppo
      </Button>
    </form>
  );
}
