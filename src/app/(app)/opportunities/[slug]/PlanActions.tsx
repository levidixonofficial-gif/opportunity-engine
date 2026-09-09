"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { generatePlanAction, selectOpportunityAction } from "../actions";

export function PlanActions({ opportunityId, hasPlan }: { opportunityId: string; hasPlan: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, start] = useTransition();
  const [note, setNote] = useState<string | null>(null);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await generatePlanAction(opportunityId);
            if (res.error) {
              toast({ tone: res.limited ? "info" : "error", title: res.error });
              return;
            }
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
            try {
              await selectOpportunityAction(opportunityId);
              setNote("Pinned to your dashboard as your current opportunity.");
            } catch {
              toast({ tone: "error", title: "Could not set your focus. Try again." });
            }
          })
        }
      >
        Make this my focus
      </Button>
      {note && <span className="text-xs text-success">{note}</span>}
    </div>
  );
}
