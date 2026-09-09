"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { BUDGET_LABELS, TIME_LABELS } from "@/lib/validations/enums";

interface Category {
  slug: string;
  label: string;
}

export function Filters({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const setParam = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      if (value) next.set(key, value);
      else next.delete(key);
      router.replace(`${pathname}?${next.toString()}`);
    },
    [params, pathname, router],
  );

  const select =
    "h-9 rounded-md border bg-surface px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div className="flex flex-wrap gap-2">
      <input
        defaultValue={params.get("q") ?? ""}
        onChange={(e) => setParam("q", e.target.value)}
        placeholder="Search opportunities"
        className="h-9 min-w-48 flex-1 rounded-md border bg-surface px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <select className={select} value={params.get("category") ?? ""} onChange={(e) => setParam("category", e.target.value)}>
        <option value="">All categories</option>
        {categories.map((c) => (
          <option key={c.slug} value={c.slug}>{c.label}</option>
        ))}
      </select>
      <select className={select} value={params.get("cost") ?? ""} onChange={(e) => setParam("cost", e.target.value)}>
        <option value="">Any budget</option>
        {Object.entries(BUDGET_LABELS).map(([k, v]) => (
          <option key={k} value={k}>{v}</option>
        ))}
      </select>
      <select className={select} value={params.get("time") ?? ""} onChange={(e) => setParam("time", e.target.value)}>
        <option value="">Any time</option>
        {Object.entries(TIME_LABELS).map(([k, v]) => (
          <option key={k} value={k}>{v}</option>
        ))}
      </select>
      <select className={select} value={params.get("sort") ?? "recommended"} onChange={(e) => setParam("sort", e.target.value)}>
        <option value="recommended">Best fit</option>
        <option value="difficulty_asc">Easiest first</option>
        <option value="newest">Newest</option>
      </select>
      <label className="flex items-center gap-1.5 text-sm text-muted">
        <input
          type="checkbox"
          checked={params.get("beginner") === "1"}
          onChange={(e) => setParam("beginner", e.target.checked ? "1" : "")}
          className="size-4 rounded border"
        />
        Beginner-friendly
      </label>
    </div>
  );
}
