"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { PROJECT_STATUS_OPTIONS } from "../constants";
import { setProjectStatusAction, deleteProjectAction } from "../actions";

export function StatusControl({ projectId, status }: { projectId: string; status: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { toast } = useToast();

  return (
    <div className="flex items-center gap-2">
      <select
        value={status}
        disabled={pending}
        onChange={(e) =>
          start(async () => {
            await setProjectStatusAction(projectId, e.target.value as never);
            toast({ tone: "success", title: `Moved to ${e.target.value}` });
            router.refresh();
          })
        }
        className="h-9 rounded-md border bg-surface px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Project status"
      >
        {PROJECT_STATUS_OPTIONS.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>

      <Button variant="ghost" size="icon" aria-label="Delete project" onClick={() => setConfirmOpen(true)}>
        <Trash2 className="size-4" />
      </Button>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() =>
          start(async () => {
            await deleteProjectAction(projectId);
          })
        }
        title="Delete this project?"
        description="The project and its milestones are removed. Tasks, deals, and transactions are kept but unlinked. This cannot be undone."
        confirmLabel="Delete project"
        destructive
        pending={pending}
      />
    </div>
  );
}
