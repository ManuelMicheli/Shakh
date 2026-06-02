"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Passato ai metadati → il trigger popola profiles.display_name.
        data: { display_name: displayName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setLoading(false);

    if (error) {
      toast({ title: "Registrazione fallita", description: error.message, variant: "error" });
      return;
    }

    // Se l'email richiede conferma non c'è sessione attiva.
    if (data.session) {
      router.push("/app/onboarding");
      router.refresh();
    } else {
      toast({
        title: "Conferma la tua email",
        description: "Ti abbiamo inviato un link per attivare l'account.",
        variant: "success",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Crea il tuo account</h1>
        <p className="mt-1 text-sm text-text-muted">
          Inizia il percorso da principiante a giocatore di club.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="displayName">Nome</Label>
          <Input
            id="displayName"
            autoComplete="name"
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>
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
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className="text-xs text-text-muted">Almeno 8 caratteri.</p>
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Attendi…" : "Registrati"}
        </Button>
      </form>

      <p className="text-center text-sm text-text-muted">
        Hai già un account?{" "}
        <Link href="/login" className="text-text underline underline-offset-4">
          Accedi
        </Link>
      </p>
    </div>
  );
}
