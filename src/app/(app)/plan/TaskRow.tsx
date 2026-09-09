"use client";

import { useTransition } from "react";
import { Check, RotateCcw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { setTaskStatusAction } from "./actions";

interface Task {
  id: string;
  title: string;
  detail: string | null;
  status: string;
}

export function TaskRow({ task }: { task: Task }) {
  const [pending, start] = useTransition();
  const done = task.status === "done";
  const skipped = task.status === "skipped";

  return (
    <div className={cn("flex items-start gap-3 py-3", pending && "opacity-50")}>
      <button
        aria-label={done ? "Mark not done" : "Mark done"}
        onClick={() => start(() => setTaskStatusAction(task.id, done ? "todo" : "done"))}
        className={cn(
          "mt-0.5 grid size-5 shrink-0 place-items-center rounded border transition-colors",
          done ? "border-accent bg-accent text-accent-fg" : "hover:border-accent",
        )}
      >
        {done && <Check className="size-3.5" />}
      </button>
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm font-medium", (done || skipped) && "text-muted line-through")}>{task.title}</p>
        {task.detail && <p className="text-xs text-muted">{task.detail}</p>}
      </div>
      <div className="flex gap-1">
        {skipped ? (
          <button
            onClick={() => start(() => setTaskStatusAction(task.id, "todo"))}
            className="rounded p-1 text-muted hover:bg-surface-2"
            aria-label="Restore task"
          >
            <RotateCcw className="size-4" />
          </button>
        ) : (
          !done && (
            <button
              onClick={() => start(() => setTaskStatusAction(task.id, "skipped"))}
              className="rounded p-1 text-muted hover:bg-surface-2"
              aria-label="Skip task"
            >
              <X className="size-4" />
            </button>
          )
        )}
      </div>
    </div>
  );
}
