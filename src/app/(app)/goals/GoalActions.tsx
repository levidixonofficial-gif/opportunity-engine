"use client";

import { useState, useTransition } from "react";
import { MoreHorizontal } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/dialog";
import { setGoalStatusAction, deleteGoalAction } from "./actions";

export function GoalActions({ goalId, status }: { goalId: string; status: string }) {
  const [menu, setMenu] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();

  return (
    <div className="relative">
      <button
        onClick={() => setMenu((m) => !m)}
        aria-label="Goal actions"
        className="grid size-7 place-items-center rounded-md text-muted hover:bg-surface-2"
      >
        <MoreHorizontal className="size-4" />
      </button>
      {menu && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
          <div className="absolute right-0 top-8 z-20 w-40 rounded-md border bg-surface py-1 text-sm shadow-[var(--shadow-lg)]">
            {status !== "archived" && (
              <button
                className="block w-full px-3 py-1.5 text-left hover:bg-surface-2"
                onClick={() => {
                  setMenu(false);
                  start(() => setGoalStatusAction(goalId, "archived"));
                }}
              >
                Archive
              </button>
            )}
            {status === "archived" && (
              <button
                className="block w-full px-3 py-1.5 text-left hover:bg-surface-2"
                onClick={() => {
                  setMenu(false);
                  start(() => setGoalStatusAction(goalId, "active"));
                }}
              >
                Reactivate
              </button>
            )}
            <button
              className="block w-full px-3 py-1.5 text-left text-danger hover:bg-surface-2"
              onClick={() => {
                setMenu(false);
                setConfirm(true);
              }}
            >
              Delete
            </button>
          </div>
        </>
      )}
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={() => start(() => deleteGoalAction(goalId))}
        title="Delete this goal?"
        description="The goal is removed permanently. Your underlying data (revenue, tasks) is untouched."
        confirmLabel="Delete goal"
        destructive
        pending={pending}
      />
    </div>
  );
}
