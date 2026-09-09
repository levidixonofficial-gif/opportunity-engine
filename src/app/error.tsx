"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Surfaced to Sentry automatically via instrumentation when a DSN is set.
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-5 text-center">
      <h1 className="text-lg font-semibold">Something went wrong</h1>
      <p className="mt-2 text-sm text-muted">
        Your information is safe. This has been logged. Try again — if it keeps happening, use the
        help button to tell us.
      </p>
      {error.digest && <p className="mt-1 text-xs text-muted-2">Reference: {error.digest}</p>}
      <Button className="mt-4" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
