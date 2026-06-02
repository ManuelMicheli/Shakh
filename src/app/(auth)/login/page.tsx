"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get("redirect") ?? "/app";
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast({ title: "Accesso fallito", description: error.message, variant: "error" });
      return;
    }
    router.push(redirect);
    router.refresh();
  };

  const onMagicLink = async () => {
    if (!email) {
      toast({ title: "Inserisci la tua email", variant: "error" });
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirect)}`,
      },
    });
    setLoading(false);
    toast(
      error
        ? { title: "Errore", description: error.message, variant: "error" }
        : { title: "Controlla la tua email", description: "Ti abbiamo inviato un link di accesso.", variant: "success" },
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Accedi</h1>
        <p className="mt-1 text-sm text-text-muted">
          Bentornato. Continua il tuo studio.
        </p>
      </div>

      <form onSubmit={onPassword} className="space-y-4">
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
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/reset-password"
              className="text-xs text-text-muted hover:text-text"
            >
              Password dimenticata?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Attendi…" : "Accedi"}
        </Button>
      </form>

      <div className="flex items-center gap-3 text-xs text-text-muted">
        <span className="h-px flex-1 bg-border" />
        oppure
        <span className="h-px flex-1 bg-border" />
      </div>

      <Button
        variant="secondary"
        className="w-full"
        onClick={onMagicLink}
        disabled={loading}
      >
        Accedi con magic link
      </Button>

      <p className="text-center text-sm text-text-muted">
        Non hai un account?{" "}
        <Link href="/signup" className="text-text underline underline-offset-4">
          Registrati
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
