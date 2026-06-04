"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

export interface ConfirmResignButtonProps {
  onConfirm: () => void;
  disabled?: boolean;
  className?: string;
  label?: string;
  size?: "sm" | "md";
}

/**
 * Pulsante "Abbandona" con conferma obbligatoria: l'abbandono è irreversibile,
 * quindi apre un dialog di conferma prima di eseguire.
 */
export function ConfirmResignButton({
  onConfirm,
  disabled,
  className,
  label,
  size = "sm",
}: ConfirmResignButtonProps) {
  const t = useTranslations("play");
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="danger"
        size={size}
        disabled={disabled}
        className={className}
        onClick={() => setOpen(true)}
      >
        <Flag className="h-4 w-4" />
        {label ?? t("resign.label")}
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={t("resign.confirmTitle")}
        description={t("resign.confirmDesc")}
      >
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>
            {t("cancel")}
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              setOpen(false);
              onConfirm();
            }}
          >
            {t("resign.confirm")}
          </Button>
        </div>
      </Dialog>
    </>
  );
}
