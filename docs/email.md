# Email (Phase 7)

## Provider: Resend

`RESEND_API_KEY` (server-only), `RESEND_FROM_EMAIL`. Domain authentication records in
`dns.md`.

## Interface

`src/lib/email/` exposes `sendEmail({ to, template, data })`. Templates are typed
React components rendered to HTML. No key configured → the message is logged to the
server console (dev) so flows are still testable.

## Transactional messages

| Trigger | Template |
|---|---|
| First sign-in / user.created | Welcome |
| Subscription started / changed | Billing confirmation |
| `invoice.payment_failed` | Payment failure + fix link |
| Task due (daily cron, Phase 7) | Task reminder digest |
| Weekly (cron) | Progress summary — revenue logged, tasks done, streak |
| New high-fit opportunity | Recommendation |
| AI usage limit reached | Usage notice |
| Product updates (opt-in) | Announcement |

All respect `NotificationPreference`. Every email has an unsubscribe/preferences link.

## Rules

- API key never reaches the client.
- No financial figures in subject lines.
- Marketing/product-update sends require the `productUpdates` opt-in.
