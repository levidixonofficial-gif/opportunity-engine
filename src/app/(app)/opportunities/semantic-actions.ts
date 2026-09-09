"use server";

import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { rateLimit, RL } from "@/lib/ratelimit";
import { semanticOpportunitySearch } from "@/server/services/opportunities";

export interface NaturalSearchHit {
  slug: string;
  name: string;
  summary: string;
  category: string;
  fitScore: number | null;
  reasons: string[];
}

export interface NaturalSearchResponse {
  mode: "semantic" | "keyword";
  query: string;
  hits: NaturalSearchHit[];
  error?: string;
}

export async function naturalSearchAction(query: string): Promise<NaturalSearchResponse> {
  const user = await requireUser();
  const q = z.string().trim().min(3).max(300).safeParse(query);
  if (!q.success) return { mode: "keyword", query, hits: [], error: "Ask a fuller question (3+ characters)." };

  const rl = await rateLimit("search", user.id, RL.mutation);
  if (!rl.success) {
    return { mode: "keyword", query, hits: [], error: "Slow down a moment, then try again." };
  }

  const res = await semanticOpportunitySearch(user.id, q.data);
  return {
    mode: res.mode,
    query: res.query,
    hits: res.results.map(({ opportunity: o, fit }) => ({
      slug: o.slug,
      name: o.name,
      summary: o.summary,
      category: o.category.label,
      fitScore: fit?.score ?? null,
      reasons: fit?.reasons.slice(0, 2) ?? [],
    })),
  };
}
