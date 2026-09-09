"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, CheckCircle2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { deleteTransactionAction, markInvoicePaidAction } from "./actions";

export function TxRowActions({ id }: { id: string }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();
  return (
    <>
      <button
        onClick={() => setConfirm(true)}
        aria-label="Delete entry"
        className="rounded p-1 text-muted hover:text-danger"
      >
        <Trash2 className="size-4" />
      </button>
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={() =>
          start(async () => {
            await deleteTransactionAction(id);
            router.refresh();
          })
        }
        title="Delete this entry?"
        description="It is removed permanently and your totals update."
        confirmLabel="Delete"
        destructive
        pending={pending}
      />
    </>
  );
}

export function InvoiceRowActions({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const { toast } = useToast();
  return (
    <button
      disabled={pending}
      onClick={() =>
        start(async () => {
          await markInvoicePaidAction(id);
          toast({ tone: "success", title: "Marked paid", description: "Revenue logged." });
          router.refresh();
        })
      }
      className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs hover:bg-surface-2"
    >
      <CheckCircle2 className="size-3.5" /> Mark paid
    </button>
  );
}
