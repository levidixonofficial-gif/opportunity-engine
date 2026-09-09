"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { DEAL_STAGE_LABELS } from "@/lib/validations/enums";
import {
  setContactStageAction,
  deleteContactAction,
  addInteractionAction,
  scheduleFollowUpAction,
  addDealAction,
} from "../actions";

const STAGES = Object.entries(DEAL_STAGE_LABELS);

export function ContactControls({ contactId, stage }: { contactId: string; stage: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const { toast } = useToast();

  return (
    <div className="flex items-center gap-2">
      <select
        value={stage}
        disabled={pending}
        onChange={(e) =>
          start(async () => {
            await setContactStageAction(contactId, e.target.value as never);
            toast({ tone: "success", title: `Stage: ${DEAL_STAGE_LABELS[e.target.value as never]}` });
            router.refresh();
          })
        }
        className="h-9 rounded-md border bg-surface px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Pipeline stage"
      >
        {STAGES.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
      <Button variant="ghost" size="icon" aria-label="Delete contact" onClick={() => setConfirm(true)}>
        <Trash2 className="size-4" />
      </Button>
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={() => start(async () => { await deleteContactAction(contactId); })}
        title="Delete this contact?"
        description="The contact, its interactions, and its deals are removed permanently."
        confirmLabel="Delete"
        destructive
        pending={pending}
      />
    </div>
  );
}

export function InteractionForm({ contactId }: { contactId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <form
      action={(fd) =>
        start(async () => {
          await addInteractionAction(contactId, fd);
          router.refresh();
        })
      }
      className="flex flex-col gap-2 sm:flex-row"
    >
      <select
        name="type"
        className="h-9 rounded-md border bg-surface px-2 text-sm sm:w-32"
        defaultValue="note"
      >
        {["note", "call", "email", "meeting", "outreach"].map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      <input
        name="body"
        required
        maxLength={4000}
        placeholder="Log a call, note, or next step…"
        className="h-9 flex-1 rounded-md border bg-surface px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "…" : "Log"}
      </Button>
    </form>
  );
}

export function FollowUpForm({
  contactId,
  current,
}: {
  contactId: string;
  current: Date | string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const { toast } = useToast();
  return (
    <form
      action={(fd) =>
        start(async () => {
          await scheduleFollowUpAction(contactId, fd);
          toast({ tone: "success", title: "Follow-up scheduled", description: "Added to your tasks." });
          router.refresh();
        })
      }
      className="space-y-2"
    >
      {current && (
        <p className="text-xs text-muted">
          Currently: {new Date(current).toLocaleDateString()}
        </p>
      )}
      <input
        type="date"
        name="date"
        required
        className="h-9 w-full rounded-md border bg-surface px-3 text-sm"
      />
      <input
        name="note"
        maxLength={200}
        placeholder="What's the next step? (optional)"
        className="h-9 w-full rounded-md border bg-surface px-3 text-sm"
      />
      <Button type="submit" size="sm" className="w-full" disabled={pending}>
        {pending ? "…" : "Schedule + add task"}
      </Button>
    </form>
  );
}

export function DealForm({ contactId }: { contactId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <form
      action={(fd) =>
        start(async () => {
          await addDealAction(contactId, fd);
          router.refresh();
        })
      }
      className="flex flex-col gap-2 sm:flex-row"
    >
      <input
        name="title"
        required
        maxLength={160}
        placeholder="Deal name"
        className="h-9 flex-1 rounded-md border bg-surface px-3 text-sm"
      />
      <input
        name="value"
        inputMode="decimal"
        placeholder="$ value"
        className="h-9 w-28 rounded-md border bg-surface px-3 text-sm"
      />
      <Button type="submit" size="sm" disabled={pending}>
        Add
      </Button>
    </form>
  );
}
