"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

/** A button that asks for confirmation before running a (usually destructive) action. */
export function ConfirmAction({ trigger, title, description, confirmLabel, destructive = true, onConfirm }: {
  trigger: React.ReactNode;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  return <AlertDialog open={open} onOpenChange={next => !busy && setOpen(next)}>
    <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
    <AlertDialogContent dir="rtl" className="text-right">
      <AlertDialogHeader className="text-right sm:text-right">
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription>{description}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter className="gap-2 sm:justify-start">
        <AlertDialogAction
          className={destructive ? "bg-red-600 hover:bg-red-700" : undefined}
          disabled={busy}
          onClick={async event => {
            event.preventDefault();
            setBusy(true);
            try {
              await onConfirm();
              setOpen(false);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy && <Loader2 className="animate-spin" />}{confirmLabel}
        </AlertDialogAction>
        <AlertDialogCancel disabled={busy}>إلغاء</AlertDialogCancel>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}
