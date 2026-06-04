"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const router = useRouter();
  const t = useTranslations("nav");
  const [loading, setLoading] = useState(false);

  const logout = async () => {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={logout}
      disabled={loading}
      aria-label={t("signOut")}
    >
      <LogOut className="h-4 w-4" />
    </Button>
  );
}
