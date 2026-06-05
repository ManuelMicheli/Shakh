"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Dumbbell, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { createRepertoire, deleteRepertoire } from "@/app/app/repertorio/actions";
import { cn } from "@/lib/utils";
import type { PieceColor } from "@/lib/theory/repertoire";

export interface RepertoireItem {
  id: string;
  name: string;
  color: PieceColor;
  moves: number;
}

function ColorDot({ color }: { color: PieceColor }) {
  return (
    <span
      className={cn(
        "inline-block h-2.5 w-2.5 rounded-full border",
        color === "white" ? "border-border bg-bg" : "border-text bg-text",
      )}
      aria-hidden
    />
  );
}

function RepCard({
  r,
  onDelete,
  pending,
  t,
}: {
  r: RepertoireItem;
  onDelete: (id: string) => void;
  pending: boolean;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <div className="group rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-text">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <ColorDot color={r.color} />
          <div>
            <p className="font-medium">{r.name}</p>
            <p className="font-mono text-[11px] text-text-muted">
              {r.color === "white" ? t("color.white") : t("color.black")} ·{" "}
              {t("repertoireList.movesCount", { count: r.moves })}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(r.id)}
          disabled={pending}
          aria-label={t("repertoireList.deleteAria")}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="mt-4 flex gap-2">
        <Link
          href={`/app/repertorio/${r.id}`}
          className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md border border-border bg-surface-2 text-sm font-medium text-text transition-colors hover:bg-surface"
        >
          <Pencil className="h-3.5 w-3.5" /> {t("repertoireList.editor")}
        </Link>
        <Link
          href={`/app/repertorio/${r.id}/training`}
          className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md bg-text text-sm font-medium text-bg transition-colors hover:bg-text/90"
        >
          <Dumbbell className="h-3.5 w-3.5" /> {t("repertoireList.train")}
        </Link>
      </div>
    </div>
  );
}

export function RepertoireList({ items }: { items: RepertoireItem[] }) {
  const t = useTranslations("theory");
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [color, setColor] = useState<PieceColor>("white");
  const [pending, start] = useTransition();

  const onCreate = () => {
    start(async () => {
      const res = await createRepertoire(name, color);
      if (!res.ok || !res.data) {
        toast({ title: t("repertoireList.notCreated"), description: res.error, variant: "error" });
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
        toast({ title: t("repertoireList.notDeleted"), description: res.error, variant: "error" });
        return;
      }
      router.refresh();
    });
  };

  const white = items.filter((r) => r.color === "white");
  const black = items.filter((r) => r.color === "black");
  const columns: { key: PieceColor; label: string; items: RepertoireItem[] }[] = [
    { key: "white", label: t("color.white"), items: white },
    { key: "black", label: t("color.black"), items: black },
  ];

  return (
    <div className="space-y-8">
      {/* Barra crea-repertorio */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onCreate();
        }}
        className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-surface p-4"
      >
        <div className="flex-1 min-w-[14rem] space-y-1.5">
          <label className="text-xs uppercase tracking-wide text-text-muted" htmlFor="rep-name">
            {t("repertoireList.name")}
          </label>
          <input
            id="rep-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("repertoireList.namePlaceholder")}
            className="flex h-10 w-full items-center rounded-lg bg-surface-2 px-3 font-mono text-sm text-text outline-none placeholder:text-text-muted focus-visible:ring-2 focus-visible:ring-text/30"
          />
        </div>
        <div className="space-y-1.5">
          <span className="block text-xs uppercase tracking-wide text-text-muted">
            {t("repertoireList.color")}
          </span>
          <div className="flex rounded-lg border border-border p-0.5">
            {(["white", "black"] as PieceColor[]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors",
                  color === c ? "bg-text font-medium text-bg" : "text-text-muted hover:text-text",
                )}
              >
                <ColorDot color={c} /> {c === "white" ? t("color.white") : t("color.black")}
              </button>
            ))}
          </div>
        </div>
        <button
          type="submit"
          disabled={pending || !name.trim()}
          className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-text px-5 text-sm font-medium text-bg transition-colors hover:bg-text/90 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> {t("repertoireList.create")}
        </button>
      </form>

      {items.length === 0 ? (
        <p className="text-sm text-text-muted">{t("repertoireList.empty")}</p>
      ) : (
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {columns.map((col) => (
            <div key={col.key} className="space-y-3">
              <div className="flex items-center gap-3">
                <ColorDot color={col.key} />
                <h3 className="font-display text-xl font-semibold tracking-tight">{col.label}</h3>
                <span className="font-mono text-[11px] text-text-muted">{col.items.length}</span>
              </div>
              {col.items.map((r) => (
                <RepCard key={r.id} r={r} onDelete={onDelete} pending={pending} t={t} />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
