import "server-only";
import { publicEnv, integrations } from "@/lib/env";

/**
 * Server-side product analytics. Adapter = PostHog capture API. No key => no-op.
 *
 * Event properties MUST NOT contain free-text (names, notes, messages) or
 * financial amounts (see docs/analytics.md). Callers pass counts/enums only.
 */

export type AnalyticsEvent =
  | "user_signed_up"
  | "onboarding_completed"
  | "opportunity_viewed"
  | "opportunity_saved"
  | "opportunity_selected"
  | "plan_generated"
  | "task_completed"
  | "project_created"
  | "goal_created"
  | "revenue_recorded"
  | "lead_created"
  | "outreach_drafted"
  | "ai_request_made"
  | "generator_run"
  | "subscription_started"
  | "subscription_canceled";

type Props = Record<string, string | number | boolean | null | undefined>;

export async function track(distinctId: string, event: AnalyticsEvent, properties: Props = {}) {
  if (!integrations.posthog) return;
  try {
    await fetch(`${publicEnv.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com"}/capture/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: publicEnv.NEXT_PUBLIC_POSTHOG_KEY,
        event,
        distinct_id: distinctId,
        properties: { ...sanitize(properties), $lib: "opportunity-engine-server" },
        timestamp: new Date().toISOString(),
      }),
    });
  } catch {
    // analytics must never break a request
  }
}

/** Drop anything that looks like PII/financial data as a safety net. */
function sanitize(props: Props): Props {
  const out: Props = {};
  for (const [k, v] of Object.entries(props)) {
    if (typeof v === "string" && v.length > 64) continue;
    if (/email|name|note|message|body|amount|cents|revenue|phone/i.test(k)) {
      if (typeof v === "number") out[k] = v; // a count is fine
      continue;
    }
    out[k] = v;
  }
  return out;
}
