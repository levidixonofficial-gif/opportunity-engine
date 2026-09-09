"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setFeatureFlagAction } from "./actions";

const STATES = ["off", "on", "beta", "admin_only"];

export function FlagToggle({ flagKey, state }: { flagKey: string; state: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <select
      value={state}
      disabled={pending}
      onChange={(e) =>
        start(async () => {
          await setFeatureFlagAction(flagKey, e.target.value);
          router.refresh();
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
