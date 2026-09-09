# Vector search (Phase 4)

## Purpose

Natural-language opportunity discovery, e.g. *"something I can start this weekend with
almost no money and no inventory"*.

## Provider

Pinecone (`PINECONE_API_KEY`, `PINECONE_INDEX_NAME`). Embeddings via a small
embedding model; the vector store sits behind a `vectorStore` interface in
`src/lib/vector/` so the provider is swappable and testable.

## What gets indexed (spec §13 — not everything)

| Indexed | Not indexed |
|---|---|
| `Opportunity` (name + summary + description + economics prose) | User financial rows (`Transaction`) |
| `KnowledgeDocument` | Contacts / CRM data |
| User notes **only** when explicitly flagged `indexable` | AI conversation history |
| Business-model reference content | Anything with PII |

Each indexed row stores its vector id back on the model (`embeddingId`) so re-indexing
is incremental and deletes are clean.

## Query flow

1. Embed the query.
2. Pinecone top-k over the opportunity namespace (filtered to `status = published`).
3. Hydrate the matched `Opportunity` rows from Postgres.
4. Re-rank with the deterministic Fit Score so personalization still applies.
5. Return opportunities + the knowledge chunks used, for the assistant's context.

## Degradation

No Pinecone config → `vectorStore` falls back to Postgres `ILIKE` keyword search over
name/summary/description. Results are labelled "keyword search" in the UI so the
behaviour is honest.
