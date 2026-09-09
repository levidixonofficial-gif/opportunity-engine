"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { TextField, TextAreaField, SelectField } from "@/components/ui/form-fields";
import { PROJECT_STATUS_OPTIONS } from "./constants";
import { createProjectAction } from "./actions";

export function NewProjectButton({
  opportunities,
}: {
  opportunities: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createProjectAction, {});

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" /> New project
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="New project" description="Turn an opportunity into tracked work.">
        <form action={formAction} className="space-y-4">
          <TextField label="Name" name="name" required minLength={2} maxLength={120} data-autofocus placeholder="e.g. Weekend pressure-washing route" />
          <TextAreaField label="Description" name="description" rows={3} placeholder="What is this project, in a sentence or two?" />
          <SelectField
            label="Linked opportunity"
            name="opportunityId"
            defaultValue=""
            options={[{ value: "", label: "None" }, ...opportunities.map((o) => ({ value: o.id, label: o.name }))]}
          />
          <div className="grid grid-cols-2 gap-3">
            <SelectField label="Status" name="status" defaultValue="planning" options={PROJECT_STATUS_OPTIONS} />
            <TextField label="Revenue target ($)" name="revenueTarget" type="text" inputMode="decimal" placeholder="1000" />
          </div>
          <TextField label="Deadline" name="deadline" type="date" />
          {state?.error && <p className="text-sm text-danger" role="alert">{state.error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Creating…" : "Create project"}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
