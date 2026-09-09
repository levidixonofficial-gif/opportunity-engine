"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { generatePlanAction, selectOpportunityAction } from "../actions";

export function PlanActions({ opportunityId, hasPlan }: { opportunityId: string; hasPlan: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [note, setNote] = useState<string | null>(null);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        disabled={pending}
        onClick={() =>
          start(async () => {
            await generatePlanAction(opportunityId);
            router.push("/plan");
          })
        }
      >
        {hasPlan ? "Open my plan" : pending ? "Generating…" : "Generate 30-day plan"}
      </Button>
      <Button
        variant="outline"
        disabled={pending}
        onClick={() =>
          start(async () => {
            await selectOpportunityAction(opportunityId);
            setNote("Pinned to your dashboard as your current opportunity.");
          })
        }
      >
        Make this my focus
      </Button>
      {note && <span className="text-xs text-success">{note}</span>}
    </div>
  );
}
