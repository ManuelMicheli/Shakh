"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { createInvite, revokeInvite } from "@/app/app/gruppi/actions";
import { GROUP_ROLE_LABEL, type GroupRole, type InviteRow } from "@/lib/groups/types";

function inviteLink(code: string): string {
  if (typeof window === "undefined") return `/app/join/${code}`;
  return `${window.location.origin}/app/join/${code}`;
}

function inviteState(inv: InviteRow): { label: string; muted: boolean } {
  if (inv.usedBy) return { label: "used", muted: true };
  if (inv.expiresAt && new Date(inv.expiresAt) <= new Date())
    return { label: "expired", muted: true };
  return { label: "active", muted: false };
}

export function InviteManager({ groupId, invites }: { groupId: string; invites: InviteRow[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [role, setRole] = useState<GroupRole>("member");
  const [days, setDays] = useState("7");
  const [email, setEmail] = useState("");
  const [pending, start] = useTransition();

  const onCreate = () => {
    start(async () => {
      const res = await createInvite(groupId, {
        role,
        expiresInDays: days ? Number(days) : null,
        email: email || null,
      });
      if (!res.ok || !res.data) {
        toast({ title: "Invite not created", description: res.error, variant: "error" });
        return;
      }
      setEmail("");
      await navigator.clipboard?.writeText(inviteLink(res.data.code)).catch(() => {});
      toast({ title: "Invite created", description: "Link copied to clipboard." });
      router.refresh();
    });
  };

  const onRevoke = (id: string) => {
    start(async () => {
      const res = await revokeInvite(groupId, id);
      if (!res.ok) {
        toast({ title: "Not revoked", description: res.error, variant: "error" });
        return;
      }
      router.refresh();
    });
  };

  const copy = (code: string) => {
    navigator.clipboard?.writeText(inviteLink(code)).then(
      () => toast({ title: "Link copied" }),
      () => toast({ title: "Copy failed", variant: "error" }),
    );
  };

  return (
    <div className="space-y-5">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onCreate();
        }}
        className="flex flex-wrap items-end gap-3"
      >
        <div className="space-y-1">
          <span className="block text-xs text-text-muted">Role</span>
          <div className="inline-flex rounded-md border border-border bg-surface p-0.5">
            {(["member", "instructor"] as GroupRole[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={
                  "rounded px-3 py-1.5 text-sm transition-colors " +
                  (role === r ? "bg-text text-bg" : "text-text-muted hover:text-text")
                }
              >
                {GROUP_ROLE_LABEL[r]}
              </button>
            ))}
          </div>
        </div>
        <div className="w-24 space-y-1">
          <label className="text-xs text-text-muted" htmlFor="inv-days">
            Expires (days)
          </label>
          <Input
            id="inv-days"
            type="number"
            min="1"
            value={days}
            onChange={(e) => setDays(e.target.value)}
          />
        </div>
        <div className="min-w-[12rem] flex-1 space-y-1">
          <label className="text-xs text-text-muted" htmlFor="inv-email">
            Email (optional)
          </label>
          <Input
            id="inv-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="reserve the invite for an email"
          />
        </div>
        <Button type="submit" disabled={pending}>
          Generate invite
        </Button>
      </form>

      {invites.length === 0 ? (
        <p className="text-sm text-text-muted">No invites generated.</p>
      ) : (
        <ul className="divide-y divide-border">
          {invites.map((inv) => {
            const st = inviteState(inv);
            return (
              <li
                key={inv.id}
                className="flex flex-wrap items-center justify-between gap-3 py-2.5"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm">{inv.code}</span>
                    <Badge variant="muted">{GROUP_ROLE_LABEL[inv.roleInGroup]}</Badge>
                    <Badge variant={st.muted ? "muted" : undefined}>{st.label}</Badge>
                  </div>
                  <p className="text-xs text-text-muted">
                    {inv.email ? `${inv.email} · ` : ""}
                    {inv.expiresAt
                      ? `expires ${new Date(inv.expiresAt).toLocaleDateString("en-US")}`
                      : "no expiration"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {!st.muted && (
                    <Button variant="secondary" size="sm" onClick={() => copy(inv.code)}>
                      Copy link
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    onClick={() => onRevoke(inv.id)}
                  >
                    Revoke
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
