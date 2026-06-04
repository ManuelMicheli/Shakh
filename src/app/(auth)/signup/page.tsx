"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";

/** Età in anni interi da una data ISO (yyyy-mm-dd); null se non valida. */
function ageFromDate(iso: string): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [parentalEmail, setParentalEmail] = useState("");
  const [parentalConsent, setParentalConsent] = useState(false);
  const [loading, setLoading] = useState(false);

  // Età dalla data di nascita; soglia consenso digitale: 14 anni (IT).
  const age = ageFromDate(birthDate);
  const isMinor = age !== null && age < 14;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (age === null) {
      toast({ title: "Enter your date of birth", variant: "error" });
      return;
    }
    if (isMinor && (!parentalConsent || !parentalEmail.trim())) {
      toast({
        title: "Parental consent required",
        description:
          "Under 14, a parent or guardian's email and consent are required.",
        variant: "error",
      });
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Passato ai metadati → il trigger popola profiles (display_name,
        // birth_date, consenso genitoriale).
        data: {
          display_name: displayName,
          birth_date: birthDate,
          parental_consent: isMinor ? parentalConsent : false,
          parental_email: isMinor ? parentalEmail.trim() : "",
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setLoading(false);

    if (error) {
      toast({ title: "Sign-up failed", description: error.message, variant: "error" });
      return;
    }

    // Se l'email richiede conferma non c'è sessione attiva.
    if (data.session) {
      router.push("/app/onboarding");
      router.refresh();
    } else {
      toast({
        title: "Confirm your email",
        description: "We've sent you a link to activate your account.",
        variant: "success",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Create your account</h1>
        <p className="mt-1 text-sm text-text-muted">
          Start the path from beginner to club player.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="displayName">Name</Label>
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
          <p className="text-xs text-text-muted">At least 8 characters.</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="birthDate">Date of birth</Label>
          <Input
            id="birthDate"
            type="date"
            autoComplete="bday"
            required
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
          />
          <p className="text-xs text-text-muted">
            Used to verify digital consent (in Italy: age 14).
          </p>
        </div>

        {isMinor && (
          <div className="space-y-3 rounded-md border border-border bg-surface-2 p-4">
            <p className="text-sm">
              You&apos;re under 14: a parent or guardian&apos;s consent is required.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="parentalEmail">Parent/guardian email</Label>
              <Input
                id="parentalEmail"
                type="email"
                value={parentalEmail}
                onChange={(e) => setParentalEmail(e.target.value)}
              />
            </div>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={parentalConsent}
                onChange={(e) => setParentalConsent(e.target.checked)}
                className="mt-1 h-4 w-4 accent-[var(--accent)]"
              />
              <span className="text-text-muted">
                I am a parent/guardian and I consent to the creation of the account
                and to the processing of data as described in the{" "}
                <Link href="/privacy" className="underline underline-offset-2">
                  privacy policy
                </Link>
                .
              </span>
            </label>
          </div>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Please wait…" : "Sign up"}
        </Button>
      </form>

      <p className="text-center text-sm text-text-muted">
        Already have an account?{" "}
        <Link href="/login" className="text-text underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </div>
  );
}
