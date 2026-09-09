"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TextField, TextAreaField, SelectField } from "@/components/ui/form-fields";
import { useToast } from "@/components/ui/toast";
import { upsertOpportunityAction } from "../../actions";

interface Opp {
  id: string;
  slug: string;
  name: string;
  categoryId: string;
  summary: string;
  description: string;
  difficulty: number;
  learningCurve: number;
  competitionLevel: number;
  scalability: number;
  demandScore: number;
  startupCostBand: string;
  timeCommitment: string;
  isOnline: boolean;
  isServiceBased: boolean;
  beginnerFriendly: boolean;
  status: string;
  revenueModel: string;
  monetizationNotes: string;
  riskNotes: string;
  profitFactors: string;
  targetCustomer: string;
}

const COST = ["lt_50", "50_250", "250_1000", "1000_plus"].map((v) => ({ value: v, label: v }));
const TIME = ["30_min", "1_hr", "2_3_hr", "4_plus_hr"].map((v) => ({ value: v, label: v }));
const SCALE = [1, 2, 3, 4, 5].map((v) => ({ value: String(v), label: String(v) }));
const STATUS = ["draft", "published", "archived"].map((v) => ({ value: v, label: v }));

export function OpportunityForm({
  categories,
  opportunity,
}: {
  categories: { id: string; label: string }[];
  opportunity: Opp | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [state, action, pending] = useActionState(upsertOpportunityAction, {});
  const o = opportunity;

  useEffect(() => {
    if (state.ok) {
      toast({ tone: "success", title: "Saved" });
      router.push("/admin/opportunities");
    }
  }, [state, toast, router]);

  return (
    <form action={action} className="space-y-4">
      {o && <input type="hidden" name="id" value={o.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label="Name" name="name" required defaultValue={o?.name} />
        <TextField label="Slug" name="slug" required defaultValue={o?.slug} hint="lowercase-with-hyphens" />
      </div>
      <SelectField
        label="Category"
        name="categoryId"
        defaultValue={o?.categoryId ?? categories[0]?.id}
        options={categories.map((c) => ({ value: c.id, label: c.label }))}
      />
      <TextField label="Summary" name="summary" required defaultValue={o?.summary} />
      <TextAreaField label="Description" name="description" rows={4} required defaultValue={o?.description} />
      <TextAreaField label="Who pays (target customer)" name="targetCustomer" rows={2} defaultValue={o?.targetCustomer} />

      <div className="grid gap-3 sm:grid-cols-3">
        <SelectField label="Difficulty" name="difficulty" defaultValue={String(o?.difficulty ?? 3)} options={SCALE} />
        <SelectField label="Learning curve" name="learningCurve" defaultValue={String(o?.learningCurve ?? 3)} options={SCALE} />
        <SelectField label="Competition" name="competitionLevel" defaultValue={String(o?.competitionLevel ?? 3)} options={SCALE} />
        <SelectField label="Scalability" name="scalability" defaultValue={String(o?.scalability ?? 3)} options={SCALE} />
        <SelectField label="Demand" name="demandScore" defaultValue={String(o?.demandScore ?? 3)} options={SCALE} />
        <SelectField label="Status" name="status" defaultValue={o?.status ?? "draft"} options={STATUS} />
        <SelectField label="Startup cost" name="startupCostBand" defaultValue={o?.startupCostBand ?? "lt_50"} options={COST} />
        <SelectField label="Time" name="timeCommitment" defaultValue={o?.timeCommitment ?? "1_hr"} options={TIME} />
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="isOnline" defaultChecked={o?.isOnline ?? true} className="size-4 rounded border" /> Online
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="isServiceBased" defaultChecked={o?.isServiceBased ?? true} className="size-4 rounded border" /> Service-based
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="beginnerFriendly" defaultChecked={o?.beginnerFriendly ?? false} className="size-4 rounded border" /> Beginner-friendly
        </label>
      </div>

      <TextAreaField label="Typical business model" name="revenueModel" rows={2} required defaultValue={o?.revenueModel} />
      <TextAreaField label="Possible monetization" name="monetizationNotes" rows={2} required defaultValue={o?.monetizationNotes} />
      <TextAreaField label="Risk considerations" name="riskNotes" rows={2} required defaultValue={o?.riskNotes} />
      <TextAreaField label="Factors that influence profitability" name="profitFactors" rows={2} required defaultValue={o?.profitFactors} />

      {state.error && <p className="text-sm text-danger" role="alert">{state.error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => router.push("/admin/opportunities")}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save opportunity"}
        </Button>
      </div>
    </form>
  );
}
