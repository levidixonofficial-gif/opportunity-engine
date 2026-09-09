"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { startUpgradeAction, openBillingPortalAction, devSetPlanAction } from "./actions";

export function UpgradeButton({ plan, current }: { plan: "pro" | "premium"; current: string }) {
  const [pending, start] = useTransition();
  const { toast } = useToast();
  const isCurrent = current === plan;
  return (
    <Button
      variant={plan === "pro" ? "primary" : "outline"}
      disabled={pending || isCurrent}
      onClick={() =>
        start(async () => {
          try {
            await startUpgradeAction(plan);
          } catch (e) {
            toast({ tone: "error", title: e instanceof Error ? e.message : "Could not start checkout" });
          }
        })
      }
    >
      {isCurrent ? "Current plan" : pending ? "Redirecting…" : `Upgrade to ${plan}`}
    </Button>
  );
}

export function BillingPortalButton() {
  const [pending, start] = useTransition();
  const { toast } = useToast();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          try {
            await openBillingPortalAction();
          } catch (e) {
            toast({ tone: "error", title: e instanceof Error ? e.message : "Portal unavailable" });
          }
        })
      }
    >
      {pending ? "Opening…" : "Manage billing"}
    </Button>
  );
}

export function DevPlanSwitcher({ current }: { current: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const { toast } = useToast();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted">Dev: set plan to</span>
      {(["free", "pro", "premium"] as const).map((p) => (
        <button
          key={p}
          disabled={pending || current === p}
          onClick={() =>
            start(async () => {
              const res = await devSetPlanAction(p);
              if (res?.error) toast({ tone: "error", title: res.error });
              else {
                toast({ tone: "success", title: `Plan set to ${p}` });
                router.refresh();
              }
            })
          }
          className="rounded border px-2 py-1 text-xs capitalize hover:bg-surface-2 disabled:opacity-40"
        >
          {p}
        </button>
      ))}
    </div>
  );
}
