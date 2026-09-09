# Analytics (Phase 7)

## Provider: PostHog

`NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`. No key → the client wrapper is
a no-op.

## Tracked events

`user_signed_up`, `onboarding_completed`, `opportunity_viewed`, `opportunity_saved`,
`opportunity_selected`, `plan_generated`, `task_completed`, `project_created`,
`revenue_recorded` (count only, **no amount**), `ai_request_made` (kind + model,
no content), `subscription_started`, `subscription_canceled`.

## Funnels

- Activation: `user_signed_up → onboarding_completed → opportunity_saved →
  plan_generated → task_completed`
- Monetization: `opportunity_viewed → … → subscription_started`
- Retention: weekly return + `task_completed` streak

## Privacy

- No free-text (notes, messages, names) in event properties.
- No revenue/expense amounts — only that an entry happened.
- Server-side capture for sensitive events; client capture for navigation only.
- Respect Do-Not-Track and the cookie choice.
