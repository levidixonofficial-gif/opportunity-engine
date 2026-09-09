# AI (Phase 4)

## Provider

Anthropic Claude via `@anthropic-ai/sdk`. Models from env:
`AI_MODEL_DEFAULT` (`claude-sonnet-5`) and `AI_MODEL_FAST`
(`claude-haiku-4-5-20251001`). Premium plan unlocks the default model for the
assistant; lower plans use the fast model.

## Components

1. **Assistant** (`AiConversation` kind `assistant`) — a business/income coach, not a
   blank chatbot. Context assembled server-side from the user's profile, active goals,
   current opportunity, open tasks, recent transactions summary, and retrieved
   opportunity/knowledge chunks (see `vector-search.md`). The user's raw financial
   rows are **not** sent — only aggregates.
2. **Generators** (kinds `offer`, `outreach`, `content`, `idea`, `digital_product`,
   `action_plan`, `analysis`) — single-shot, structured output validated with Zod
   before display/persistence.
3. **Action Plan Generator** — produces a task list that is written as a real `Plan` +
   `Task` rows (`source: "ai"`), mirroring the deterministic template path.

## Cost control (spec §35)

- `checkUsage(plan, "aiMessagesPerMonth" | "generatorRunsPerMonth" | ...)` gates every
  call; `UsageCounter` rows are incremented in the same transaction as the message
  write.
- Hard token cap per request; context is trimmed to a budget before sending.
- Identical generator inputs are cached (Upstash) for a short TTL.
- Model is selected by plan, not by the client.
- A usage widget on `/ai` and `/billing` shows remaining quota.

## Safety (spec §30)

System prompts forbid: guaranteed income/customers/returns, deceptive or spammy
tactics, fraud, and illegal activity. Output that violates this is not shown. All
economic language stays in "typical / possible / estimated" form.

## Degradation

No `ANTHROPIC_API_KEY` → every AI endpoint returns a structured
`{ error: "AI is not configured" }` with HTTP 501. No canned "AI" text is ever
returned (spec §52).
