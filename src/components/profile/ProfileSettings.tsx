"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
      toast({ title: "Export failed", description: res.error, variant: "error" });
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
      toast({ title: "Deletion failed", description: res.error, variant: "error" });
      return;
    }
    setConfirmDelete(false);
    router.push("/");
    router.refresh();
  };

  const [displayName, setDisplayName] = useState(initial.displayName);
  const [username, setUsername] = useState(initial.username);
  const [locale, setLocale] = useState(initial.locale || "en");
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
        toast({ title: "Save failed", description: res.error, variant: "error" });
        return;
      }
      toast({ title: "Profile updated" });
    });
  };

  const onChangePassword = async () => {
    if (password.length < 8) {
      toast({ title: "Password too short", description: "At least 8 characters.", variant: "error" });
      return;
    }
    if (password !== password2) {
      toast({ title: "Passwords don't match", variant: "error" });
      return;
    }
    setChangingPwd(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setChangingPwd(false);
    if (error) {
      toast({ title: "Password change failed", description: error.message, variant: "error" });
      return;
    }
    setPassword("");
    setPassword2("");
    toast({ title: "Password updated" });
  };

  return (
    <div className="space-y-6">
      {/* Dati profilo */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>How we present you in the app.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="displayName">Display name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="username"
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={onSaveProfile} disabled={savingProfile}>
              {savingProfile ? "Saving…" : "Save"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Aspetto */}
      <Card>
        <CardHeader>
          <CardTitle>Appearance and language</CardTitle>
          <CardDescription>The theme applies right away; save to remember it.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Theme</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={theme === "dark" ? "primary" : "secondary"}
                onClick={() => setTheme("dark")}
              >
                Dark
              </Button>
              <Button
                variant={theme === "light" ? "primary" : "secondary"}
                onClick={() => setTheme("light")}
              >
                Light
              </Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Language</Label>
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
              {savingProfile ? "Saving…" : "Save preferences"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Account */}
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Change your sign-in password.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="pwd">New password</Label>
            <Input
              id="pwd"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pwd2">Confirm password</Label>
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
              {changingPwd ? "…" : "Update password"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Gruppi e circoli (attivati nel 09) */}
      <Card>
        <CardHeader>
          <CardTitle>Groups and clubs</CardTitle>
          <CardDescription>Join a club or a class, or create your own.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/app/gruppi"
            className="inline-flex h-9 items-center rounded-md border border-border px-4 text-sm font-medium text-text hover:bg-surface-2"
          >
            Manage your groups
          </Link>
        </CardContent>
      </Card>

      {/* Privacy e dati (diritti dell'interessato, prompt 10 §1) */}
      <Card>
        <CardHeader>
          <CardTitle>Privacy and data</CardTitle>
          <CardDescription>
            Export your data or permanently delete your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Export my data</p>
              <p className="text-xs text-text-muted">
                Profile, games, progress, and repertoires in JSON format.
              </p>
            </div>
            <Button variant="secondary" onClick={onExport} disabled={exporting}>
              {exporting ? "Preparing…" : "Export"}
            </Button>
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-border pt-4">
            <div>
              <p className="text-sm font-medium">Delete account</p>
              <p className="text-xs text-text-muted">
                Permanent removal of your account and linked data. Irreversible.
              </p>
            </div>
            <Button variant="danger" onClick={() => setConfirmDelete(true)}>
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete your account?"
        description="This action is irreversible: your profile, games, progress, and repertoires will be deleted forever."
      >
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onDelete} disabled={deleting}>
            {deleting ? "Deleting…" : "Delete permanently"}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
