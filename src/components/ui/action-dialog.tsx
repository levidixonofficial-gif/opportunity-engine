"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import type { FormState } from "@/lib/form";

/**
 * A create/edit dialog wired to a server action of the shape
 * `(prev: FormState, formData: FormData) => Promise<FormState>`.
 *
 * Handles: pending state, error display, success toast, close, and refresh —
 * without a setState-in-effect (the action is awaited inside a transition).
 */
export function ActionDialog({
  trigger,
  title,
  description,
  action,
  submitLabel = "Save",
  successToast = "Saved",
  onSuccess,
  className,
  children,
}: {
  trigger: (open: () => void) => React.ReactNode;
  title: string;
  description?: string;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  submitLabel?: string;
  successToast?: string;
  onSuccess?: (state: FormState) => void;
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(formData: FormData) {
    setError(null);
    start(async () => {
      const res = await action({}, formData);
      if (res.error) {
        setError(res.error);
        return;
      }
      toast({ tone: "success", title: successToast });
      setOpen(false);
      onSuccess?.(res);
      router.refresh();
    });
  }

  return (
    <>
      {trigger(() => setOpen(true))}
      <Dialog open={open} onClose={() => setOpen(false)} title={title} description={description} className={className}>
        <form action={submit} className="space-y-3">
          {children}
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Working…" : submitLabel}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
