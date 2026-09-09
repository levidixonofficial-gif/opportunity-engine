"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Loader2, Sparkles, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { naturalSearchAction, type NaturalSearchResponse } from "./semantic-actions";

const EXAMPLES = [
  "Something I can start this weekend with almost no money and no inventory",
  "A way to use writing skills without building an audience",
  "Recurring revenue, works from anywhere, not too competitive",
];

export function NaturalSearch() {
  const [q, setQ] = useState("");
  const [res, setRes] = useState<NaturalSearchResponse | null>(null);
  const [pending, start] = useTransition();

  function run(query: string) {
    setQ(query);
    start(async () => setRes(await naturalSearchAction(query)));
  }

  return (
    <Card>
      <CardContent className="space-y-3 pt-5">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-accent" />
          <p className="text-sm font-medium">Describe what you want in plain language</p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (q.trim().length >= 3) run(q);
          }}
          className="flex gap-2"
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="e.g. start this weekend, no inventory, under $50"
            className="h-10 flex-1 rounded-md border bg-surface px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button type="submit" disabled={pending || q.trim().length < 3}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : "Search"}
          </Button>
          {res && (
            <Button type="button" variant="ghost" size="icon" aria-label="Clear" onClick={() => { setRes(null); setQ(""); }}>
              <X className="size-4" />
            </Button>
          )}
        </form>

        {!res && (
          <div className="flex flex-wrap gap-1.5">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => run(ex)}
                className="rounded-full border px-2.5 py-1 text-xs text-muted hover:text-foreground"
              >
                {ex}
              </button>
            ))}
          </div>
        )}

        {res && (
          <div className="space-y-2">
            <p className="text-xs text-muted">
              {res.mode === "semantic" ? "Semantic match" : "Keyword match"} · {res.hits.length} result
              {res.hits.length !== 1 ? "s" : ""}
              {res.error ? ` · ${res.error}` : ""}
            </p>
            {res.hits.map((h) => (
              <Link
                key={h.slug}
                href={`/opportunities/${h.slug}`}
                className="flex items-start justify-between gap-3 rounded-md border p-3 hover:bg-surface-2"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge>{h.category}</Badge>
                    <span className="truncate font-medium">{h.name}</span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted">{h.summary}</p>
                  {h.reasons.length > 0 && (
                    <p className="mt-0.5 text-xs text-muted">Why: {h.reasons.join(" · ")}</p>
                  )}
                </div>
                {h.fitScore !== null && <span className="shrink-0 font-semibold text-accent">{h.fitScore}</span>}
              </Link>
            ))}
            {res.hits.length === 0 && !res.error && (
              <p className="text-sm text-muted">No close matches. Try different words or browse the full list below.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
