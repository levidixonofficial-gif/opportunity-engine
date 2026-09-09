"use client";

import { useRouter } from "next/navigation";
import { Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActionDialog } from "@/components/ui/action-dialog";
import { TextField, TextAreaField, SelectField } from "@/components/ui/form-fields";
import { DEAL_STAGE_LABELS } from "@/lib/validations/enums";
import { createContactAction, importLeadsAction } from "./actions";

const STAGE_OPTIONS = Object.entries(DEAL_STAGE_LABELS).map(([value, label]) => ({ value, label }));

export function NewContactButton() {
  const router = useRouter();
  return (
    <ActionDialog
      title="New contact"
      description="A lead, prospect, or customer."
      action={createContactAction}
      submitLabel="Add contact"
      successToast="Contact added"
      onSuccess={(s) => {
        if (s.message) router.push(`/leads/${s.message}`);
      }}
      trigger={(open) => (
        <Button onClick={open}>
          <Plus className="size-4" /> New contact
        </Button>
      )}
    >
      <div className="grid grid-cols-2 gap-3">
        <TextField label="Name" name="name" required data-autofocus />
        <TextField label="Company" name="company" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <TextField label="Email" name="email" type="email" />
        <TextField label="Phone" name="phone" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <TextField label="Title" name="title" />
        <SelectField label="Stage" name="stage" defaultValue="lead" options={STAGE_OPTIONS} />
      </div>
      <TextField label="Source" name="source" placeholder="referral, outreach, inbound…" />
      <TextAreaField label="Notes" name="notes" rows={2} />
    </ActionDialog>
  );
}

export function ImportLeadsButton() {
  return (
    <ActionDialog
      title="Import leads"
      description="Paste your own CSV. We never scrape or buy lists. Every row is marked unverified until you confirm it."
      action={importLeadsAction}
      submitLabel="Import"
      successToast="Import complete"
      className="max-w-lg"
      trigger={(open) => (
        <Button variant="outline" onClick={open}>
          <Upload className="size-4" /> Import
        </Button>
      )}
    >
      <TextField
        label="Where did this list come from?"
        name="sourceUrl"
        placeholder="e.g. exported from my email tool, a conference attendee list…"
      />
      <TextAreaField
        label="CSV (header row required)"
        name="csv"
        rows={7}
        required
        placeholder={"name,email,company,title\nJane Doe,jane@acme.com,Acme,Owner"}
        className="font-mono text-xs"
      />
      <p className="text-xs text-muted">
        Recognized columns: name (required), email, company, phone, website, title. Duplicates by
        email are skipped.
      </p>
    </ActionDialog>
  );
}
