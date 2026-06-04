"use client";

import { useEffect, useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import {
  beginLinkExternalAccount,
  verifyExternalAccount,
  refreshExternalAccount,
  unlinkExternalAccount,
  type LinkedAccount,
} from "@/app/app/profilo/actions";
import type { ExternalSource } from "@/lib/rating/calibration";

const SOURCE_LABEL: Record<ExternalSource, string> = {
  lichess: "Lichess",
  chesscom: "Chess.com",
};

/** Dove incollare il token su ciascuna piattaforma. */
const VERIFY_HINT: Record<ExternalSource, string> = {
  lichess:
    "Paste the token into your Lichess bio (Preferences → Edit profile → Biography), save, then press Verify.",
  chesscom:
    "Paste the token into the Name or Location field of your Chess.com profile (Settings → Profile), save, then press Verify.",
};

export interface ExternalAccountsProps {
  initial: LinkedAccount[];
  /** Senza cornice Card: per incorporare il blocco in un altro contenitore (es. onboarding). */
  bare?: boolean;
  /** Notifica al genitore ogni variazione degli account (collegamento/verifica/scollegamento). */
  onAccountsChange?: (accounts: LinkedAccount[]) => void;
}

/**
 * Collega e verifica Lichess / Chess.com. Il rating online incide sul Rating
 * Shakh (dominio 'external') SOLO dopo la verifica di proprietà via bio-token.
 */
export function ExternalAccounts({ initial, bare = false, onAccountsChange }: ExternalAccountsProps) {
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<LinkedAccount[]>(initial);
  const bySource = (s: ExternalSource) => accounts.find((a) => a.source === s);

  // Tiene il genitore in sincronia (l'onboarding decide se proporre il salto del mini-test).
  useEffect(() => {
    onAccountsChange?.(accounts);
  }, [accounts, onAccountsChange]);

  const upsert = (acc: LinkedAccount) =>
    setAccounts((prev) => [...prev.filter((a) => a.source !== acc.source), acc]);
  const remove = (s: ExternalSource) =>
    setAccounts((prev) => prev.filter((a) => a.source !== s));

  const rows = (["lichess", "chesscom"] as ExternalSource[]).map((source) => (
    <SourceRow
      key={source}
      source={source}
      account={bySource(source)}
      onChanged={upsert}
      onRemoved={() => remove(source)}
      toast={toast}
    />
  ));

  if (bare) return <div className="space-y-5">{rows}</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Online accounts</CardTitle>
        <CardDescription>
          Link Lichess or Chess.com: after verification, your online rating
          weighs heavily on your Shakh Rating, mapped to the real-world (OTB) scale.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">{rows}</CardContent>
    </Card>
  );
}

interface SourceRowProps {
  source: ExternalSource;
  account?: LinkedAccount;
  onChanged: (acc: LinkedAccount) => void;
  onRemoved: () => void;
  toast: ReturnType<typeof useToast>["toast"];
}

function SourceRow({ source, account, onChanged, onRemoved, toast }: SourceRowProps) {
  const [username, setUsername] = useState("");
  const [pending, start] = useTransition();

  const onBegin = () => {
    start(async () => {
      const res = await beginLinkExternalAccount(source, username);
      if (!res.ok || !res.account) {
        toast({ title: "Linking failed", description: res.error, variant: "error" });
        return;
      }
      onChanged(res.account);
      setUsername("");
      toast({ title: "Token generated", description: "Add it to your profile, then verify." });
    });
  };

  const onVerify = () => {
    start(async () => {
      const res = await verifyExternalAccount(source);
      if (!res.ok || !res.account) {
        toast({ title: "Verification failed", description: res.error, variant: "error" });
        return;
      }
      onChanged(res.account);
      const parts = ["Shakh Rating updated."];
      if (res.seed?.importedGames) parts.push(`${res.seed.importedGames} games imported.`);
      if (res.seed?.startingLevel != null)
        parts.push(`Path at level ${res.seed.startingLevel}.`);
      toast({ title: `${SOURCE_LABEL[source]} verified`, description: parts.join(" ") });
    });
  };

  const onRefresh = () => {
    start(async () => {
      const res = await refreshExternalAccount(source);
      if (!res.ok || !res.account) {
        toast({ title: "Update failed", description: res.error, variant: "error" });
        return;
      }
      onChanged(res.account);
      toast({ title: "Rating updated" });
    });
  };

  const onUnlink = () => {
    start(async () => {
      const res = await unlinkExternalAccount(source);
      if (!res.ok) {
        toast({ title: "Unlinking failed", description: res.error, variant: "error" });
        return;
      }
      onRemoved();
      toast({ title: `${SOURCE_LABEL[source]} unlinked` });
    });
  };

  const onCopy = (token: string) => {
    void navigator.clipboard?.writeText(token);
    toast({ title: "Token copied" });
  };

  // Stato 3: account verificato.
  if (account?.verified) {
    return (
      <div className="rounded-md border border-border bg-surface-2 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-medium">
              {SOURCE_LABEL[source]}
              <span className="font-mono text-text-muted">@{account.username}</span>
              <Badge variant="muted">verified</Badge>
            </p>
            <p className="mt-1 font-mono text-xs text-text-muted">
              {account.ratingNative != null && `${account.ratingNative} online`}
              {account.ratingOtb != null && ` · ${account.ratingOtb} OTB`}
              {` · ${account.nGames} games`}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button variant="secondary" size="sm" onClick={onRefresh} disabled={pending}>
              {pending ? "…" : "Refresh"}
            </Button>
            <Button variant="ghost" size="sm" onClick={onUnlink} disabled={pending}>
              Unlink
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Stato 2: collegato ma in attesa di verifica.
  if (account && account.verifyToken) {
    return (
      <div className="space-y-3 rounded-md border border-border bg-surface-2 p-4">
        <p className="flex items-center gap-2 text-sm font-medium">
          {SOURCE_LABEL[source]}
          <span className="font-mono text-text-muted">@{account.username}</span>
          <Badge variant="muted">to verify</Badge>
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 rounded-md border border-border bg-surface px-3 py-2 font-mono text-sm">
            {account.verifyToken}
          </code>
          <Button variant="secondary" size="sm" onClick={() => onCopy(account.verifyToken!)}>
            Copy
          </Button>
        </div>
        <p className="text-xs text-text-muted">{VERIFY_HINT[source]}</p>
        <div className="flex gap-2">
          <Button size="sm" onClick={onVerify} disabled={pending}>
            {pending ? "Verifying…" : "Verify"}
          </Button>
          <Button variant="ghost" size="sm" onClick={onUnlink} disabled={pending}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  // Stato 1: non collegato.
  return (
    <div className="space-y-2">
      <Label htmlFor={`ext-${source}`} className="flex items-center gap-2">
        {SOURCE_LABEL[source]}
        <Badge variant="muted">not linked</Badge>
      </Label>
      <div className="flex gap-2">
        <Input
          id={`ext-${source}`}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder={source === "lichess" ? "Lichess username" : "Chess.com username"}
          onKeyDown={(e) => {
            if (e.key === "Enter" && username.trim()) onBegin();
          }}
        />
        <Button onClick={onBegin} disabled={pending || !username.trim()}>
          {pending ? "…" : "Link"}
        </Button>
      </div>
    </div>
  );
}
