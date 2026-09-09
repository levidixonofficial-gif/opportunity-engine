"use client";

import { useState, useTransition } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toggleSaveAction } from "./actions";

export function SaveButton({
  opportunityId,
  initialSaved,
  size = "sm",
}: {
  opportunityId: string;
  initialSaved: boolean;
  size?: "sm" | "md";
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant={saved ? "secondary" : "outline"}
        size={size}
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await toggleSaveAction(opportunityId);
            if (res.limitReached) {
              setMessage("Free plan saves 5 opportunities. Upgrade for unlimited.");
              return;
            }
            setSaved(res.saved);
            setMessage(null);
          })
        }
      >
        {saved ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
        {saved ? "Saved" : "Save"}
      </Button>
      {message && <span className="text-xs text-warning">{message}</span>}
    </div>
  );
}
