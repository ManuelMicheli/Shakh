"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { useTheme } from "@/components/providers/theme-provider";
import { createClient } from "@/lib/supabase/client";
import {
  updateProfile,
  exportMyData,
  deleteMyAccount,
} from "@/app/app/profilo/actions";

export interface ProfileSettingsProps {
  initial: {
    displayName: string;
    username: string;
    locale: string;
  };
}

/** Impostazioni profilo: dati, tema/locale, cambio password (Supabase Auth). */
export function ProfileSettings({ initial }: ProfileSettingsProps) {
  const t = useTranslations("profile");
  const { toast } = useToast();
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const [exporting, setExporting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const onExport = async () => {
    setExporting(true);
    const res = await exportMyData();
    setExporting(false);
    if (!res.ok || !res.data) {
      toast({ title: t("exportFailed"), description: res.error, variant: "error" });
      return;
    }
    const blob = new Blob([JSON.stringify(res.data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "shakh-data.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const onDelete = async () => {
    setDeleting(true);
    const res = await deleteMyAccount();
    setDeleting(false);
    if (!res.ok) {
      toast({ title: t("deletionFailed"), description: res.error, variant: "error" });
      return;
    }
    setConfirmDelete(false);
    router.push("/");
    router.refresh();
  };

  const [displayName, setDisplayName] = useState(initial.displayName);
  const [username, setUsername] = useState(initial.username);
  const [locale, setLocale] = useState(initial.locale || "it");
  const [savingProfile, startSave] = useTransition();

  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [changingPwd, setChangingPwd] = useState(false);

  const onSaveProfile = () => {
    startSave(async () => {
      const res = await updateProfile({
        displayName,
        username,
        locale,
        themePreference: theme,
      });
      if (!res.ok) {
        toast({ title: t("saveFailed"), description: res.error, variant: "error" });
        return;
      }
      toast({ title: t("profileUpdated") });
      // Ricarica i Server Component così la lingua scelta si applica subito
      // (messaggi e formati seguono il cookie NEXT_LOCALE appena impostato).
      router.refresh();
    });
  };

  const onChangePassword = async () => {
    if (password.length < 8) {
      toast({ title: t("passwordTooShort"), description: t("passwordTooShortDesc"), variant: "error" });
      return;
    }
    if (password !== password2) {
      toast({ title: t("passwordsDontMatch"), variant: "error" });
      return;
    }
    setChangingPwd(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setChangingPwd(false);
    if (error) {
      toast({ title: t("passwordChangeFailed"), description: error.message, variant: "error" });
      return;
    }
    setPassword("");
    setPassword2("");
    toast({ title: t("passwordUpdated") });
  };

  return (
    <div className="space-y-6">
      {/* Dati profilo */}
      <Card>
        <CardHeader>
          <CardTitle>{t("profileCardTitle")}</CardTitle>
          <CardDescription>{t("profileCardDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="displayName">{t("displayName")}</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={t("displayNamePlaceholder")}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="username">{t("username")}</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t("usernamePlaceholder")}
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={onSaveProfile} disabled={savingProfile}>
              {savingProfile ? t("saving") : t("save")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Aspetto */}
      <Card>
        <CardHeader>
          <CardTitle>{t("appearanceTitle")}</CardTitle>
          <CardDescription>{t("appearanceDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t("theme")}</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={theme === "dark" ? "primary" : "secondary"}
                onClick={() => setTheme("dark")}
              >
                {t("themeDark")}
              </Button>
              <Button
                variant={theme === "light" ? "primary" : "secondary"}
                onClick={() => setTheme("light")}
              >
                {t("themeLight")}
              </Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{t("language")}</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={locale === "it" ? "primary" : "secondary"}
                onClick={() => setLocale("it")}
              >
                Italiano
              </Button>
              <Button
                variant={locale === "en" ? "primary" : "secondary"}
                onClick={() => setLocale("en")}
              >
                English
              </Button>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={onSaveProfile} disabled={savingProfile}>
              {savingProfile ? t("saving") : t("savePreferences")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Account */}
      <Card>
        <CardHeader>
          <CardTitle>{t("accountCardTitle")}</CardTitle>
          <CardDescription>{t("accountCardDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="pwd">{t("newPassword")}</Label>
            <Input
              id="pwd"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pwd2">{t("confirmPassword")}</Label>
            <Input
              id="pwd2"
              type="password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={onChangePassword} disabled={changingPwd}>
              {changingPwd ? "…" : t("updatePassword")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Gruppi e circoli (attivati nel 09) */}
      <Card>
        <CardHeader>
          <CardTitle>{t("groupsTitle")}</CardTitle>
          <CardDescription>{t("groupsDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/app/gruppi"
            className="inline-flex h-9 items-center rounded-md border border-border px-4 text-sm font-medium text-text hover:bg-surface-2"
          >
            {t("manageGroups")}
          </Link>
        </CardContent>
      </Card>

      {/* Privacy e dati (diritti dell'interessato, prompt 10 §1) */}
      <Card>
        <CardHeader>
          <CardTitle>{t("privacyTitle")}</CardTitle>
          <CardDescription>
            {t("privacyDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">{t("exportMyData")}</p>
              <p className="text-xs text-text-muted">
                {t("exportMyDataDesc")}
              </p>
            </div>
            <Button variant="secondary" onClick={onExport} disabled={exporting}>
              {exporting ? t("preparing") : t("export")}
            </Button>
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-border pt-4">
            <div>
              <p className="text-sm font-medium">{t("deleteAccount")}</p>
              <p className="text-xs text-text-muted">
                {t("deleteAccountDesc")}
              </p>
            </div>
            <Button variant="danger" onClick={() => setConfirmDelete(true)}>
              {t("delete")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={t("deleteDialogTitle")}
        description={t("deleteDialogDesc")}
      >
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
            {t("cancel")}
          </Button>
          <Button variant="danger" onClick={onDelete} disabled={deleting}>
            {deleting ? t("deleting") : t("deletePermanently")}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
