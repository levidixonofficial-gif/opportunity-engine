import { env, integrations } from "@/lib/env";

/**
 * Thin error-reporting wrapper. When SENTRY_DSN is set the Sentry SDK
 * (initialized in instrumentation.ts) picks up the exception; otherwise we log
 * to the server console. Callers never depend on Sentry being present.
 *
 * Scrubbing of PII/financial data happens in the Sentry `beforeSend` hook
 * (see instrumentation.ts) — keep `context` free of raw amounts and free text.
 */
export function captureException(error: unknown, context?: Record<string, string | number>) {
  if (integrations.sentry) {
    void import("@sentry/nextjs")
      .then((Sentry) => Sentry.captureException(error, context ? { extra: context } : undefined))
      .catch(() => {
        /* ignore */
      });
  }
  if (env.NODE_ENV !== "test") {
    console.error("[error]", error instanceof Error ? error.message : error, context ?? "");
  }
}
