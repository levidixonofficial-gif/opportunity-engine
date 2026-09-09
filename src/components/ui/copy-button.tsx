"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

export function CopyButton({
  value,
  label = "Copy",
  className,
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setState("copied");
    } catch {
      // Fallback for older browsers / insecure contexts.
      try {
        const ta = document.createElement("textarea");
        ta.value = value;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        setState("copied");
      } catch {
        setState("error");
      }
    }
    setTimeout(() => setState("idle"), 2000);
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-live="polite"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border bg-surface px-2.5 py-1 text-xs font-medium transition-colors hover:bg-surface-2",
        className,
      )}
    >
      {state === "copied" ? (
        <>
          <Check className="size-3.5 text-success" /> Copied
        </>
      ) : state === "error" ? (
        <>
          <Copy className="size-3.5 text-danger" /> Copy failed
        </>
      ) : (
        <>
          <Copy className="size-3.5" /> {label}
        </>
      )}
    </button>
  );
}
