"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Costruisce il link pubblico condivisibile e offre "copia". */
export function ShareReel({ encoded }: { encoded: string }) {
  const [copied, setCopied] = useState(false);
  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/reel?d=${encodeURIComponent(encoded)}`
      : "";

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard non disponibile */
    }
  }

  return (
    <div className="flex gap-2">
      <Input readOnly value={url} className="flex-1 font-mono text-xs" />
      <Button size="sm" onClick={copy}>
        {copied ? "Copiato!" : "Copia link"}
      </Button>
    </div>
  );
}
