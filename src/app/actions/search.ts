"use server";

import { requireUser } from "@/lib/auth";
import { globalSearch, type SearchResults } from "@/server/services/search";

export async function runGlobalSearch(query: string): Promise<SearchResults> {
  const user = await requireUser();
  return globalSearch(user.id, query.slice(0, 100));
}
