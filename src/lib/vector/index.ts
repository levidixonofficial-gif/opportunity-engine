import "server-only";
import { integrations, env } from "@/lib/env";

/**
 * Semantic search abstraction.
 *
 *  - Pinecone configured -> embed the query + vector search (interface below;
 *    embedding + upsert wiring is a follow-up — see docs/vector-search.md).
 *  - not configured      -> deterministic keyword scorer over the provided
 *    corpus. Honest: results are labelled "keyword search" in the UI.
 *
 * Only opportunity + knowledge content is ever indexed — never financial rows,
 * contacts, or messages (spec §13).
 */

export interface SearchableDoc {
  id: string;
  text: string;
  keywords?: string[];
}

export interface VectorHit {
  id: string;
  score: number; // 0..1
}

export interface VectorSearchResult {
  mode: "semantic" | "keyword";
  hits: VectorHit[];
}

const STOP = new Set([
  "the", "a", "an", "and", "or", "to", "of", "for", "in", "on", "with", "no", "not",
  "i", "me", "my", "want", "need", "can", "start", "make", "money", "online", "something",
  "that", "this", "without", "some", "any", "is", "it", "get", "how", "do",
]);

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
}

/** Keyword relevance: term overlap + phrase bonus, normalized to 0..1. */
export function keywordSearch(query: string, corpus: SearchableDoc[]): VectorHit[] {
  const qTokens = tokenize(query);
  if (qTokens.length === 0) return [];
  const qSet = new Set(qTokens);
  const phrase = query.toLowerCase().trim();

  return corpus
    .map((doc) => {
      const docText = `${doc.text} ${(doc.keywords ?? []).join(" ")}`.toLowerCase();
      const docTokens = tokenize(docText);
      const docSet = new Set(docTokens);
      let overlap = 0;
      for (const t of qSet) if (docSet.has(t)) overlap++;
      const coverage = overlap / qSet.size;
      const phraseBonus = phrase.length > 6 && docText.includes(phrase) ? 0.3 : 0;
      // partial phrase: any 2-word window of the query present verbatim
      let windowBonus = 0;
      for (let i = 0; i < qTokens.length - 1; i++) {
        if (docText.includes(`${qTokens[i]} ${qTokens[i + 1]}`)) windowBonus = Math.min(0.2, windowBonus + 0.1);
      }
      const score = Math.min(1, coverage * 0.7 + phraseBonus + windowBonus);
      return { id: doc.id, score };
    })
    .filter((h) => h.score > 0.08)
    .sort((a, b) => b.score - a.score);
}

async function pineconeSearch(query: string, topK: number): Promise<VectorHit[]> {
  // Interface stub: embed(query) -> pinecone.query({ vector, topK, filter }).
  // Requires an embedding model call; wiring tracked in docs/vector-search.md.
  void query;
  void topK;
  void env.PINECONE_INDEX_NAME;
  throw new Error("Pinecone query path not yet wired");
}

export async function semanticSearch(
  query: string,
  corpus: SearchableDoc[],
  opts: { topK?: number } = {},
): Promise<VectorSearchResult> {
  const topK = opts.topK ?? 8;
  if (integrations.pinecone) {
    try {
      return { mode: "semantic", hits: (await pineconeSearch(query, topK)).slice(0, topK) };
    } catch {
      // fall through to keyword
    }
  }
  return { mode: "keyword", hits: keywordSearch(query, corpus).slice(0, topK) };
}
