"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { setFeatureFlagAction } from "./actions";

const STATES = ["off", "on", "beta", "admin_only"];

export function FlagToggle({ flagKey, state }: { flagKey: string; state: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, start] = useTransition();
  return (
    <select
      value={state}
      disabled={pending}
      onChange={(e) =>
        start(async () => {
          const res = await setFeatureFlagAction(flagKey, e.target.value);
          if (res?.error) toast({ tone: "error", title: res.error });
          else router.refresh();
        })
      }
      className="h-8 rounded-md border bg-surface px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={`${flagKey} state`}
    >
      {STATES.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}
