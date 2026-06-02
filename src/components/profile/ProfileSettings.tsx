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
      toast({ title: "Esportazione non riuscita", description: res.error, variant: "error" });
      return;
    }
    const blob = new Blob([JSON.stringify(res.data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "shakh-dati.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const onDelete = async () => {
    setDeleting(true);
    const res = await deleteMyAccount();
    setDeleting(false);
    if (!res.ok) {
      toast({ title: "Cancellazione non riuscita", description: res.error, variant: "error" });
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
        toast({ title: "Salvataggio non riuscito", description: res.error, variant: "error" });
        return;
      }
      toast({ title: "Profilo aggiornato" });
    });
  };

  const onChangePassword = async () => {
    if (password.length < 8) {
      toast({ title: "Password troppo corta", description: "Almeno 8 caratteri.", variant: "error" });
      return;
    }
    if (password !== password2) {
      toast({ title: "Le password non coincidono", variant: "error" });
      return;
    }
    setChangingPwd(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setChangingPwd(false);
    if (error) {
      toast({ title: "Cambio password non riuscito", description: error.message, variant: "error" });
      return;
    }
    setPassword("");
    setPassword2("");
    toast({ title: "Password aggiornata" });
  };

  return (
    <div className="space-y-6">
      {/* Dati profilo */}
      <Card>
        <CardHeader>
          <CardTitle>Profilo</CardTitle>
          <CardDescription>Come ti presentiamo nell&apos;app.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="displayName">Nome visualizzato</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Il tuo nome"
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
              {savingProfile ? "Salvataggio…" : "Salva"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Aspetto */}
      <Card>
        <CardHeader>
          <CardTitle>Aspetto e lingua</CardTitle>
          <CardDescription>Il tema viene applicato subito; salva per ricordarlo.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Tema</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={theme === "dark" ? "primary" : "secondary"}
                onClick={() => setTheme("dark")}
              >
                Scuro
              </Button>
              <Button
                variant={theme === "light" ? "primary" : "secondary"}
                onClick={() => setTheme("light")}
              >
                Chiaro
              </Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Lingua</Label>
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
              {savingProfile ? "Salvataggio…" : "Salva preferenze"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Account */}
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Cambia la password di accesso.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="pwd">Nuova password</Label>
            <Input
              id="pwd"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pwd2">Conferma password</Label>
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
              {changingPwd ? "…" : "Aggiorna password"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Gruppi e circoli (attivati nel 09) */}
      <Card>
        <CardHeader>
          <CardTitle>Gruppi e circoli</CardTitle>
          <CardDescription>Unisciti a un circolo o una classe, o creane uno tuo.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/app/gruppi"
            className="inline-flex h-9 items-center rounded-md border border-border px-4 text-sm font-medium text-text hover:bg-surface-2"
          >
            Gestisci i tuoi gruppi
          </Link>
        </CardContent>
      </Card>

      {/* Privacy e dati (diritti dell'interessato, prompt 10 §1) */}
      <Card>
        <CardHeader>
          <CardTitle>Privacy e dati</CardTitle>
          <CardDescription>
            Esporta i tuoi dati o elimina definitivamente l&apos;account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Esporta i miei dati</p>
              <p className="text-xs text-text-muted">
                Profilo, partite, progressi e repertori in formato JSON.
              </p>
            </div>
            <Button variant="secondary" onClick={onExport} disabled={exporting}>
              {exporting ? "Preparo…" : "Esporta"}
            </Button>
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-border pt-4">
            <div>
              <p className="text-sm font-medium">Elimina account</p>
              <p className="text-xs text-text-muted">
                Rimozione definitiva di account e dati collegati. Irreversibile.
              </p>
            </div>
            <Button variant="danger" onClick={() => setConfirmDelete(true)}>
              Elimina
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Eliminare l'account?"
        description="Questa azione è irreversibile: profilo, partite, progressi e repertori verranno cancellati per sempre."
      >
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
            Annulla
          </Button>
          <Button variant="danger" onClick={onDelete} disabled={deleting}>
            {deleting ? "Elimino…" : "Elimina definitivamente"}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
