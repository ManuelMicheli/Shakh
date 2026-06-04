"use client";

import { useState } from "react";
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
  label = "Resign",
  size = "sm",
}: ConfirmResignButtonProps) {
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
        {label}
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Resign the game?"
        description="You'll lose the game. This action can't be undone."
      >
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              setOpen(false);
              onConfirm();
            }}
          >
            Yes, resign
          </Button>
        </div>
      </Dialog>
    </>
  );
}
