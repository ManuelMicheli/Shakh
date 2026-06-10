"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("auth.signup");

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
      toast({ title: t("errBirthDateTitle"), variant: "error" });
      return;
    }
    if (isMinor && (!parentalConsent || !parentalEmail.trim())) {
      toast({
        title: t("errParentalTitle"),
        description: t("errParentalDesc"),
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
      toast({ title: t("errSignUpTitle"), description: error.message, variant: "error" });
      return;
    }

    // Se l'email richiede conferma non c'è sessione attiva.
    if (data.session) {
      router.push("/app/onboarding");
      router.refresh();
    } else {
      toast({
        title: t("confirmTitle"),
        description: t("confirmDesc"),
        variant: "success",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">{t("title")}</h1>
        <p className="mt-1 text-sm text-text-muted">{t("subtitle")}</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="displayName">{t("name")}</Label>
          <Input
            id="displayName"
            autoComplete="name"
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>
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
        <div className="space-y-1.5">
          <Label htmlFor="password">{t("password")}</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className="text-xs text-text-muted">{t("passwordHint")}</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="birthDate">{t("birthDate")}</Label>
          <Input
            id="birthDate"
            type="date"
            autoComplete="bday"
            required
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
          />
          <p className="text-xs text-text-muted">{t("birthDateHint")}</p>
        </div>

        {isMinor && (
          <div className="space-y-3 rounded-md border border-border bg-surface-2 p-4">
            <p className="text-sm">{t("minorNotice")}</p>
            <div className="space-y-1.5">
              <Label htmlFor="parentalEmail">{t("parentalEmail")}</Label>
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
                {t.rich("parentalConsentLabel", {
                  link: (chunks) => (
                    <Link href="/privacy" className="underline underline-offset-2">
                      {chunks}
                    </Link>
                  ),
                })}
              </span>
            </label>
          </div>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? t("wait") : t("submit")}
        </Button>
      </form>

      <p className="text-center text-sm text-text-muted">
        {t("haveAccount")}{" "}
        <Link href="/login" className="text-text underline underline-offset-4">
          {t("loginLink")}
        </Link>
      </p>
    </div>
  );
}
