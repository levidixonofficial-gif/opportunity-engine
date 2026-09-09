"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActionDialog } from "@/components/ui/action-dialog";
import { TextField, TextAreaField, SelectField } from "@/components/ui/form-fields";
import { addTransactionAction, createInvoiceAction } from "./actions";

interface Opt {
  id: string;
  name: string;
}

const noneOr = (opts: Opt[]) => [{ value: "", label: "None" }, ...opts.map((o) => ({ value: o.id, label: o.name }))];

export function AddTransactionButton({ projects, contacts }: { projects: Opt[]; contacts: Opt[] }) {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <ActionDialog
      title="New money entry"
      description="Log revenue or an expense."
      action={addTransactionAction}
      submitLabel="Save"
      trigger={(open) => (
        <Button onClick={open}>
          <Plus className="size-4" /> Add entry
        </Button>
      )}
    >
      <div className="grid grid-cols-2 gap-3">
        <SelectField
          label="Type"
          name="type"
          defaultValue="revenue"
          options={[
            { value: "revenue", label: "Revenue" },
            { value: "expense", label: "Expense" },
          ]}
        />
        <TextField label="Amount ($)" name="amount" required inputMode="decimal" data-autofocus placeholder="250" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <TextField label="Date" name="occurredOn" type="date" defaultValue={today} required />
        <TextField label="Category" name="category" placeholder="client work, tools…" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <SelectField label="Project" name="projectId" defaultValue="" options={noneOr(projects)} />
        <SelectField label="Client" name="contactId" defaultValue="" options={noneOr(contacts)} />
      </div>
      <TextAreaField label="Note" name="note" rows={2} />
      <label className="flex items-center gap-2 text-sm text-muted">
        <input type="checkbox" name="isEstimated" className="size-4 rounded border" />
        This is a projection, not money actually received/spent
      </label>
    </ActionDialog>
  );
}

export function NewInvoiceButton({ projects, contacts }: { projects: Opt[]; contacts: Opt[] }) {
  return (
    <ActionDialog
      title="New invoice"
      description="Marking it paid later logs the revenue automatically."
      action={createInvoiceAction}
      submitLabel="Create"
      successToast="Invoice created"
      trigger={(open) => (
        <Button variant="outline" onClick={open}>
          <Plus className="size-4" /> New invoice
        </Button>
      )}
    >
      <div className="grid grid-cols-2 gap-3">
        <TextField label="Number" name="number" required data-autofocus placeholder="INV-001" />
        <TextField label="Amount ($)" name="amount" required inputMode="decimal" placeholder="500" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <SelectField label="Client" name="contactId" defaultValue="" options={noneOr(contacts)} />
        <SelectField label="Project" name="projectId" defaultValue="" options={noneOr(projects)} />
      </div>
      <TextField label="Due date" name="dueOn" type="date" />
    </ActionDialog>
  );
}
