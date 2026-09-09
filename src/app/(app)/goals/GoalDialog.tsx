"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActionDialog } from "@/components/ui/action-dialog";
import { TextField, SelectField } from "@/components/ui/form-fields";
import { createGoalAction } from "./actions";

const METRICS = [
  { value: "revenue", label: "Revenue ($)" },
  { value: "profit", label: "Profit ($)" },
  { value: "customers", label: "Paying customers" },
  { value: "leads", label: "Leads / contacts" },
  { value: "projects", label: "Completed projects" },
  { value: "tasks", label: "Completed tasks" },
  { value: "activity", label: "Logged activities" },
  { value: "custom", label: "Custom (manual)" },
];

export function NewGoalButton() {
  return (
    <ActionDialog
      title="New goal"
      description="Goals track automatically from your real data."
      action={createGoalAction}
      submitLabel="Create goal"
      successToast="Goal created"
      trigger={(open) => (
        <Button onClick={open}>
          <Plus className="size-4" /> New goal
        </Button>
      )}
    >
      <TextField label="Title" name="title" required data-autofocus placeholder="e.g. First $1,000" />
      <div className="grid grid-cols-2 gap-3">
        <SelectField label="Track" name="metric" defaultValue="revenue" options={METRICS} />
        <TextField
          label="Target"
          name="target"
          required
          inputMode="decimal"
          placeholder="1000"
          hint="Dollars for revenue/profit; a count otherwise."
        />
      </div>
      <TextField label="Target date (optional)" name="targetDate" type="date" />
    </ActionDialog>
  );
}
