# AI (Phase 4)

## Provider

Anthropic Claude via the Messages API (`lib/ai/chat`, plain `fetch` — no SDK
dependency). Models from env: `AI_MODEL_DEFAULT` (`claude-sonnet-5`) and
`AI_MODEL_FAST` (`claude-haiku-4-5-20251001`).

Per-plan model selection is wired in `server/services/ai`:
`hasFeature(plan, "advanced_ai")` (Premium only) → `AI_MODEL_DEFAULT`; every other
plan → `AI_MODEL_FAST`. The client never chooses the model.

## Components

1. **Assistant** (`AiConversation` kind `assistant`) — a business/income coach, not a
   blank chatbot. Context assembled server-side from the user's profile, active goals,
   current opportunity, open tasks, recent transactions summary, and retrieved
   opportunity/knowledge chunks (see `vector-search.md`). The user's raw financial
   rows are **not** sent — only aggregates.
2. **Generators** (kinds `offer`, `outreach`, `content`, `idea`, `digital_product`,
   `action_plan`, `analysis`) — single-shot, structured output validated with Zod
   before display/persistence.
3. **Action Plan Generator** — returns a structured 4-week plan (weeks → tasks).
   Writing it into real `Plan` + `Task` rows (`source: "ai"`) is **not yet wired**;
   for now the deterministic "Generate 30-day plan" button on an opportunity is
   the path that creates tasks.

## Cost control (spec §35)

- `consumeUsage(userId, feature)` — increments the `UsageCounter` FIRST, then
  checks the plan limit, and **refunds** the unit if the AI call fails or the
  count would exceed the cap. This closes the check-then-act race that a plain
  "read counter → call AI → write counter" would leave open. Applies to
  `ai_message`, `generator_run`, **and `plan_generation`** (which previously had
  no enforcement at all).
- Sliding-window rate limits on top: 20 chat / 12 generator per minute.
- Hard `maxTokens` cap per request.
- Model is selected by plan, not by the client.
- `/ai` and `/billing` show remaining quota.

## Safety (spec §30)

System prompts forbid: guaranteed income/customers/returns, deceptive or spammy
tactics, fraud, and illegal activity. Output that violates this is not shown. All
economic language stays in "typical / possible / estimated" form.

## Degradation

No `ANTHROPIC_API_KEY` → every AI endpoint returns a structured
`{ error: "AI is not configured" }` with HTTP 501. No canned "AI" text is ever
returned (spec §52).
