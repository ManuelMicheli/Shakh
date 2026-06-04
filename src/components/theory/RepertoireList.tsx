"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Dumbbell, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { createRepertoire, deleteRepertoire } from "@/app/app/repertorio/actions";
import type { PieceColor } from "@/lib/theory/repertoire";

const LINK_BTN =
  "inline-flex h-8 items-center rounded-md border border-border bg-surface-2 px-3 text-sm font-medium text-text transition-colors hover:bg-surface";

export interface RepertoireItem {
  id: string;
  name: string;
  color: PieceColor;
  moves: number;
}

export function RepertoireList({ items }: { items: RepertoireItem[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [color, setColor] = useState<PieceColor>("white");
  const [pending, start] = useTransition();

  const onCreate = () => {
    start(async () => {
      const res = await createRepertoire(name, color);
      if (!res.ok || !res.data) {
        toast({ title: "Not created", description: res.error, variant: "error" });
        return;
      }
      setName("");
      router.push(`/app/repertorio/${res.data.id}`);
    });
  };

  const onDelete = (id: string) => {
    start(async () => {
      const res = await deleteRepertoire(id);
      if (!res.ok) {
        toast({ title: "Not deleted", description: res.error, variant: "error" });
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="py-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onCreate();
            }}
            className="flex flex-wrap items-end gap-3"
          >
            <div className="flex-1 min-w-[12rem] space-y-1">
              <label className="text-xs text-text-muted" htmlFor="rep-name">
                Name
              </label>
              <Input
                id="rep-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. White — Italian"
              />
            </div>
            <div className="space-y-1">
              <span className="block text-xs text-text-muted">Color</span>
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
                    {c === "white" ? "White" : "Black"}
                  </button>
                ))}
              </div>
            </div>
            <Button type="submit" disabled={pending || !name.trim()}>
              Create repertoire
            </Button>
          </form>
        </CardContent>
      </Card>

      {items.length === 0 ? (
        <p className="text-sm text-text-muted">
          No repertoires. Create one to start building your lines.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((r) => (
            <li key={r.id}>
              <Card>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="flex items-center gap-3">
                    <span
                      className="inline-block h-3 w-3 rounded-full border border-border"
                      style={{ background: r.color === "white" ? "#fafafa" : "#111" }}
                      aria-hidden
                    />
                    <div>
                      <p className="font-medium">{r.name}</p>
                      <p className="text-xs text-text-muted">
                        {r.color === "white" ? "White" : "Black"} · {r.moves} moves
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Link href={`/app/repertorio/${r.id}`} className={LINK_BTN}>
                      <Pencil className="mr-1 h-4 w-4" /> Editor
                    </Link>
                    <Link href={`/app/repertorio/${r.id}/training`} className={LINK_BTN}>
                      <Dumbbell className="mr-1 h-4 w-4" /> Train
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(r.id)}
                      disabled={pending}
                      aria-label="Delete repertoire"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
