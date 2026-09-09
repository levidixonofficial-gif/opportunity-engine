"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { setUserRoleAction } from "../actions";

export function RoleControl({ userId, role }: { userId: string; role: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const { toast } = useToast();
  return (
    <select
      value={role}
      disabled={pending}
      onChange={(e) =>
        start(async () => {
          const res = await setUserRoleAction(userId, e.target.value);
          if (res?.error) toast({ tone: "error", title: res.error });
          else router.refresh();
        })
      }
      className="h-8 rounded-md border bg-surface px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label="User role"
    >
      <option value="user">user</option>
      <option value="admin">admin</option>
    </select>
  );
}
