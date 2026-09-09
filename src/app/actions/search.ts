"use server";

import { requireUser } from "@/lib/auth";
import { rateLimit, RL } from "@/lib/ratelimit";
import { globalSearch, type SearchResults } from "@/server/services/search";

export async function runGlobalSearch(query: string): Promise<SearchResults> {
  const user = await requireUser();
  const rl = await rateLimit("search", user.id, RL.mutation);
  if (!rl.success) return { query, groups: [], total: 0 };
  return globalSearch(user.id, query.slice(0, 100));
}
