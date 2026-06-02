"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";

export default function ResetPasswordPage() {
  const { toast } = useToast();
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
      toast({ title: "Errore", description: error.message, variant: "error" });
      return;
    }
    setSent(true);
    toast({
      title: "Email inviata",
      description: "Controlla la posta per reimpostare la password.",
      variant: "success",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">
          Reimposta la password
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          Ti invieremo un link per scegliere una nuova password.
        </p>
      </div>

      {sent ? (
        <p className="text-sm text-text-muted">
          Se esiste un account per <span className="text-text">{email}</span>,
          riceverai un&apos;email a breve.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
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
            {loading ? "Attendi…" : "Invia link"}
          </Button>
        </form>
      )}

      <p className="text-center text-sm text-text-muted">
        <Link href="/login" className="text-text underline underline-offset-4">
          Torna all&apos;accesso
        </Link>
      </p>
    </div>
  );
}
