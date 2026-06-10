"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";

export default function ResetPasswordPage() {
  const { toast } = useToast();
  const t = useTranslations("auth.reset");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?redirect=/app`,
    });
    setLoading(false);
    if (error) {
      toast({ title: t("errTitle"), description: error.message, variant: "error" });
      return;
    }
    setSent(true);
    toast({
      title: t("sentTitle"),
      description: t("sentDesc"),
      variant: "success",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">{t("title")}</h1>
        <p className="mt-1 text-sm text-text-muted">{t("subtitle")}</p>
      </div>

      {sent ? (
        <p className="text-sm text-text-muted">
          {t.rich("sentNote", {
            email: () => <span className="text-text">{email}</span>,
          })}
        </p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">{t("email")}</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t("wait") : t("submit")}
          </Button>
        </form>
      )}

      <p className="text-center text-sm text-text-muted">
        <Link href="/login" className="text-text underline underline-offset-4">
          {t("back")}
        </Link>
      </p>
    </div>
  );
}
